import SQLite from 'better-sqlite3';
import { is, SQL } from 'drizzle-orm';
import { getTableConfig, SQLiteSyncDialect } from 'drizzle-orm/sqlite-core';
import * as schema from './schema';

const dialect = new SQLiteSyncDialect();
const tables = Object.values(schema).map(getTableConfig);
const quote = (name: string) => `"${name.replaceAll('"', '""')}"`;

function definition(value: unknown) {
  if (is(value, SQL)) return dialect.sqlToQuery(value).sql;
  if (typeof value === 'number') return String(value);
  if (typeof value === 'boolean') return value ? '1' : '0';
  if (typeof value === 'string') return `'${value.replaceAll("'", "''")}'`;
  throw new Error('Unsupported SQLite default value');
}

function createSchema(client: SQLite.Database) {
  for (const table of tables) {
    if (table.foreignKeys.length || table.checks.length || table.primaryKeys.length)
      throw new Error(`Unsupported schema definition: ${table.name}`);
    const columns = table.columns.map((column) => {
      const parts = [quote(column.name), column.getSQLType().toUpperCase()];
      if (column.primary) parts.push('PRIMARY KEY');
      if (column.notNull) parts.push('NOT NULL');
      if (column.isUnique && !column.primary) parts.push('UNIQUE');
      if (column.default !== undefined)
        parts.push('DEFAULT', definition(column.mapToDriverValue(column.default)));
      return parts.join(' ');
    });
    for (const unique of table.uniqueConstraints)
      columns.push(`UNIQUE (${unique.columns.map((column) => quote(column.name)).join(', ')})`);
    client.exec(`CREATE TABLE ${quote(table.name)} (${columns.join(', ')}) STRICT`);

    for (const index of table.indexes) {
      const { name, unique, where } = index.config;
      const indexedColumns = index.config.columns.map((column) =>
        is(column, SQL)
          ? dialect.sqlToQuery(column).sql.replaceAll(`${quote(table.name)}.`, '')
          : quote(column.name),
      );
      const predicate = where ? ` WHERE ${dialect.sqlToQuery(where).sql}` : '';
      client.exec(
        `CREATE ${unique ? 'UNIQUE ' : ''}INDEX ${quote(name)} ON ${quote(table.name)} (${indexedColumns.join(', ')})${predicate}`,
      );
    }
  }
}

function schemaSql(client: SQLite.Database) {
  return client
    .prepare(
      "SELECT type, name, sql FROM sqlite_master WHERE name NOT LIKE 'sqlite_%' AND type IN ('table', 'index') ORDER BY type, name",
    )
    .all();
}

export function initializeSchema(client: SQLite.Database) {
  if (!schemaSql(client).length) {
    client.transaction(() => createSchema(client)).immediate();
    return true;
  }

  const expected = new SQLite(':memory:');
  try {
    createSchema(expected);
    return JSON.stringify(schemaSql(client)) === JSON.stringify(schemaSql(expected));
  } finally {
    expected.close();
  }
}
