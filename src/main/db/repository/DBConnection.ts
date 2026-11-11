import { WorkbenchError } from '@shared/errors';
import path from 'node:path';
import SQLite from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';

const DB_FILE_NAME = 'workspace.sqlite';

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
    const file = path.join(root, DB_FILE_NAME);
    const client = new SQLite(file);
    try {
      client.pragma('foreign_keys = ON');
      client.pragma('busy_timeout = 5000');
      client.pragma('journal_mode = WAL');
      client.pragma('synchronous = FULL');
      client.pragma('secure_delete = ON');
      return new DbService(drizzle(client));
    } catch (error) {
      client.close();
      throw error;
    }
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
