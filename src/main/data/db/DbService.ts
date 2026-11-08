import { WorkbenchError } from '@shared/errors';
import fs from 'node:fs';
import path from 'node:path';
import SQLite from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { sqliteSchema } from './bootstrap';

function openDatabase(root: string) {
  fs.mkdirSync(root, { recursive: true, mode: 0o700 });
  const file = path.join(root, 'workspace.sqlite');
  fs.closeSync(fs.openSync(file, 'a', 0o600));
  const client = new SQLite(file);
  try {
    client.pragma('foreign_keys = ON');
    client.pragma('busy_timeout = 5000');
    client.pragma('journal_mode = WAL');
    client.pragma('synchronous = FULL');
    if (!client.prepare("SELECT name FROM sqlite_master WHERE type = 'table' LIMIT 1").get())
      client.transaction(() => client.exec(sqliteSchema)).immediate();
    return drizzle(client);
  } catch (error) {
    client.close();
    throw error;
  }
}

type WorkspaceDatabase = ReturnType<typeof openDatabase>;

export class DbService {
  readonly connection: WorkspaceDatabase;
  constructor(root: string) {
    this.connection = openDatabase(root);
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
