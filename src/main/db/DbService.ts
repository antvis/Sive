import { WorkbenchError } from '@shared/errors';
import fs from 'node:fs';
import path from 'node:path';
import SQLite from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { generateSQLiteDrizzleJson, generateSQLiteMigration } from 'drizzle-kit/api';
import * as schema from './schema';

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
  private constructor(
    readonly connection: ReturnType<typeof drizzle>,
    private readonly databaseExists: boolean,
  ) {}

  static async connect(root: string) {
    fs.mkdirSync(root, { recursive: true, mode: 0o700 });
    const file = path.join(root, DB_FILE_NAME);
    const databaseExists = fs.existsSync(file);
    fs.closeSync(fs.openSync(file, 'a', 0o600));
    const client = new SQLite(file);
    try {
      client.pragma('foreign_keys = ON');
      client.pragma('busy_timeout = 5000');
      client.pragma('journal_mode = WAL');
      client.pragma('synchronous = FULL');
      const database = new DbService(drizzle(client), databaseExists);
      await database.initialize();
      return database;
    } catch (error) {
      client.close();
      throw error;
    }
  }

  private async initialize() {
    if (this.databaseExists) return;
    const snapshot = await generateSQLiteDrizzleJson(schema);
    const statements = await generateSQLiteMigration({ ...snapshot, tables: {}, views: {} }, snapshot);
    const client = this.connection.$client;
    client
      .transaction(() => {
        for (const statement of statements) {
          const sql = statement.startsWith('CREATE TABLE')
            ? statement.replace(/\);\s*$/, ') STRICT;')
            : statement;
          client.exec(sql);
        }
      })
      .immediate();
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
