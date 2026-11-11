import { QUERY_OPTIONS } from '../../config';
import { WorkbenchError } from '@shared/errors';
import type { AVA, Schema, PrimaryKey } from '@antv/ava';
import { identifier } from '../../utils/sql';

const literal = (value: string) => "'" + value.replaceAll("'", "''") + "'";

const key = (value: string[]): PrimaryKey => (value.length === 1 ? value[0] : [value[0], ...value.slice(1)]);

// AVA 4 beta's MySQL metadata UNION can return JSON as binary-escaped text
// with MySQL 8. Read scalar catalog columns through the public AVA query API
// and set its public schema cache; do not patch private SDK objects.
export async function mysqlSchema(ava: AVA, database: string): Promise<Schema> {
  const read = async (sql: string) => {
    const result = await ava.query(
      `SELECT * FROM mysql_query('mysql_source', ${literal(sql)})`,
      QUERY_OPTIONS,
    );
    if (result.truncated) throw new WorkbenchError('CONNECTION', 'AVA 返回的数据库结构不完整，无法加载');
    return result.data;
  };
  const db = literal(database);
  const columns = await read(
    `SELECT TABLE_NAME AS table_name, COLUMN_NAME AS column_name, COLUMN_TYPE AS column_type, IS_NULLABLE AS nullable FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ${db} ORDER BY TABLE_NAME, ORDINAL_POSITION`,
  );
  const indexes = await read(
    `SELECT TABLE_NAME AS table_name, INDEX_NAME AS index_name, COLUMN_NAME AS column_name FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = ${db} AND NON_UNIQUE = 0 ORDER BY TABLE_NAME, INDEX_NAME, SEQ_IN_INDEX`,
  );
  const foreign = await read(
    `SELECT TABLE_NAME AS table_name, CONSTRAINT_NAME AS constraint_name, COLUMN_NAME AS column_name, REFERENCED_TABLE_NAME AS target_table, REFERENCED_COLUMN_NAME AS target_column FROM information_schema.KEY_COLUMN_USAGE WHERE TABLE_SCHEMA = ${db} AND REFERENCED_TABLE_SCHEMA = ${db} AND REFERENCED_TABLE_NAME IS NOT NULL ORDER BY TABLE_NAME, CONSTRAINT_NAME, ORDINAL_POSITION`,
  );
  const relationships: NonNullable<Schema['relationships']> = [];
  const schema: Schema = { models: [], relationships };
  const models = new Map<string, Schema['models'][number]>();
  for (const row of columns) {
    const name = String(row.table_name);
    let model = models.get(name);
    if (!model) {
      model = { name, tableReference: { table: name }, columns: [] };
      schema.models.push(model);
      models.set(name, model);
    }
    model.columns.push({
      name: String(row.column_name),
      type: String(row.column_type),
      notNull: row.nullable === 'NO',
    });
  }
  const tableIndexes = new Map<string, typeof indexes>();
  for (const row of indexes) {
    const name = String(row.table_name);
    const rows = tableIndexes.get(name) || [];
    rows.push(row);
    tableIndexes.set(name, rows);
  }
  for (const model of schema.models) {
    const keys = new Map<string, string[]>();
    const expressions = new Set<string>();
    for (const row of tableIndexes.get(model.name) || []) {
      const name = String(row.index_name);
      if (!row.column_name) {
        expressions.add(name);
        continue;
      }
      const columns = keys.get(name) || [];
      columns.push(String(row.column_name));
      keys.set(name, columns);
    }
    for (const name of expressions) keys.delete(name);
    const primary = keys.get('PRIMARY');
    if (primary) model.primaryKey = key(primary);
    model.uniqueKeys = [...keys].filter(([name]) => name !== 'PRIMARY').map(([, value]) => key(value));
  }
  const groups = new Map<string, typeof foreign>();
  for (const row of foreign) {
    const id = JSON.stringify([row.table_name, row.constraint_name]);
    const rows = groups.get(id) || [];
    rows.push(row);
    groups.set(id, rows);
  }
  for (const [name, rows] of groups) {
    const from = String(rows[0].table_name),
      to = String(rows[0].target_table);
    const model = models.get(from);
    if (!model || !models.has(to)) continue;
    const keys = [model.primaryKey, ...(model.uniqueKeys || [])]
      .filter((k) => k !== undefined)
      .map((k) => (typeof k === 'string' ? [k] : k));
    const columns = new Set(rows.map((row) => row.column_name));
    const one = keys.some((key) => key.every((column) => columns.has(column)));
    relationships.push({
      name,
      models: [from, to],
      joinType: one ? 'ONE_TO_ONE' : 'MANY_TO_ONE',
      condition: rows
        .map(
          (r) =>
            `${identifier(from)}.${identifier(String(r.column_name))} = ${identifier(to)}.${identifier(String(r.target_column))}`,
        )
        .join(' AND '),
    });
  }
  return schema;
}
