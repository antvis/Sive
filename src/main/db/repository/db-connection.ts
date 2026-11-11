import { mkdirSync } from 'node:fs';
import path from 'node:path';
import SQLite from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { SchemaDDL } from '../ddl';

const DB_FILE_NAME = 'workspace.sqlite';

/**
 * A service for managing a SQLite database connection and performing operations on it.
 *
 * @example
 * const database = await DBConnection.connect(root);
 * database.write(() => database.connection.insert(table).values(data).run());
 * database.close();
 */
export class DBConnection {
  private constructor(readonly connection: ReturnType<typeof drizzle>) {}

  static async connect(root: string) {
    mkdirSync(root, { recursive: true });
    const file = path.join(root, DB_FILE_NAME);
    const client = new SQLite(file);
    try {
      client.exec(SchemaDDL);
      client.pragma('foreign_keys = ON');
      client.pragma('busy_timeout = 5000');
      client.pragma('journal_mode = WAL');
      client.pragma('synchronous = FULL');
      client.pragma('secure_delete = ON');
      return new DBConnection(drizzle(client));
    } catch (error) {
      client.close();
      throw error;
    }
  }

  close() {
    this.connection.$client.close();
  }

  write<T>(operation: () => T): T {
    return this.connection.transaction(operation, { behavior: 'immediate' });
  }
}
