import { createConnection, type RowDataPacket } from 'mysql2/promise';
import type { MySQLInput, TableDetails } from '@shared/contracts';

const identifier = (text: string) => '`' + text.replaceAll('`', '``') + '`';

// DuckDB mysql_query only describes SELECT results, so SHOW CREATE is read
// through a short-lived native connection. Only fixed metadata commands run here.
export async function mysqlTableDetails(
  options: Pick<MySQLInput, 'host' | 'port' | 'database' | 'user' | 'password'>,
  table: string,
): Promise<TableDetails> {
  const connection = await createConnection({
    host: options.host,
    port: options.port,
    database: options.database,
    user: options.user,
    password: options.password,
    connectTimeout: 10000,
    multipleStatements: false,
  });
  try {
    const [rows] = await connection.query<RowDataPacket[]>({
      sql: 'SELECT INDEX_NAME AS index_name, COLUMN_NAME AS column_name, NON_UNIQUE AS non_unique, INDEX_TYPE AS index_type FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? ORDER BY INDEX_NAME, SEQ_IN_INDEX',
      values: [options.database, table],
      timeout: 10000,
    });
    const byName = new Map<string, TableDetails['indexes'][number]>();
    for (const row of rows) {
      const name = String(row.index_name);
      let index = byName.get(name);
      if (!index) {
        index = { name, columns: [], unique: Number(row.non_unique) === 0, type: String(row.index_type) };
        byName.set(name, index);
      }
      index.columns.push(row.column_name == null ? '表达式索引' : String(row.column_name));
    }
    const indexes = [...byName.values()].sort((a, b) =>
      a.name === 'PRIMARY' ? -1 : b.name === 'PRIMARY' ? 1 : a.name.localeCompare(b.name),
    );
    try {
      const [definition] = await connection.query<RowDataPacket[]>({
        sql: 'SHOW CREATE TABLE ' + identifier(options.database) + '.' + identifier(table),
        timeout: 10000,
      });
      const ddl = definition[0]?.['Create Table'] ?? definition[0]?.['Create View'];
      if (typeof ddl !== 'string') return { indexes, ddlError: '建表语句不可用，请在数据库工具中查看。' };
      return { indexes, ddl };
    } catch {
      return { indexes, ddlError: '建表语句读取失败，请检查表或视图的查看权限后重试。' };
    }
  } finally {
    connection.destroy();
  }
}
