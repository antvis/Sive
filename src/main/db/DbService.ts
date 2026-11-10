import { WorkbenchError } from '@shared/errors';
import fs from 'node:fs';
import path from 'node:path';
import SQLite from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { initializeSchema } from './schemaDefinition';

const DB_FILE_NAME = 'workspace.sqlite';

function openClient(file: string) {
  fs.closeSync(fs.openSync(file, 'a', 0o600));
  const client = new SQLite(file);
  try {
    client.pragma('foreign_keys = ON');
    client.pragma('busy_timeout = 5000');
    client.pragma('journal_mode = WAL');
    client.pragma('synchronous = FULL');
    client.pragma('secure_delete = ON');
    return client;
  } catch (error) {
    client.close();
    throw error;
  }
}

function removeDatabase(file: string) {
  for (const suffix of ['', '-wal', '-shm']) fs.rmSync(file + suffix, { force: true });
}

/**
 * A service for managing a SQLite database connection and performing operations on it.
 *
 * @example
 * const database = await DbService.connect(root);
 * database.write(() => database.connection.insert(table).values(data).run());
 * database.close();
 */
export class DbService {
  private constructor(readonly connection: ReturnType<typeof drizzle>) {}

  static async connect(root: string) {
    fs.mkdirSync(root, { recursive: true, mode: 0o700 });
    const file = path.join(root, DB_FILE_NAME);
    let client: SQLite.Database | undefined;
    try {
      client = openClient(file);
      if (initializeSchema(client)) return new DbService(drizzle(client));
    } catch (error) {
      if (!(
        error instanceof SQLite.SqliteError && ['SQLITE_NOTADB', 'SQLITE_CORRUPT'].includes(error.code)
      )) {
        if (client?.open) client.close();
        throw error;
      }
    }
    if (client?.open) client.close();
    removeDatabase(file);
    client = openClient(file);
    try {
      initializeSchema(client);
      return new DbService(drizzle(client));
    } catch (error) {
      client.close();
      throw error;
    }
  }

  checkpointDeletedContent() {
    const result = this.connection.$client.pragma('wal_checkpoint(TRUNCATE)') as { busy: number }[];
    if (result[0]?.busy)
      throw new WorkbenchError('PERSISTENCE', '记录已删除，但数据库日志仍在使用；关闭并重启应用后会清理。');
  }

  close() {
    this.connection.$client.close();
  }

  write<T>(operation: () => T): T {
    try {
      return this.connection.transaction(operation, { behavior: 'immediate' });
    } catch (error) {
      if (error instanceof WorkbenchError) throw error;
      throw new WorkbenchError('PERSISTENCE', '保存失败，请检查磁盘空间或目录权限；原数据已保留。');
    }
  }
}
