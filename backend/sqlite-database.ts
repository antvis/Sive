import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync, type SQLInputValue, type StatementSync } from 'node:sqlite';
import { WorkbenchError } from '../shared/errors';
import { sqliteSchema } from './sqlite-schema';

export class SQLiteDatabase {
  private connection: DatabaseSync;
  private statements = new Map<string, StatementSync>();

  constructor(root: string) {
    fs.mkdirSync(root, { recursive: true, mode: 0o700 });
    const file = path.join(root, 'workspace.sqlite');
    // Create with private permissions before SQLite can create its sidecar files.
    const fd = fs.openSync(file, 'a', 0o600);
    fs.closeSync(fd);
    this.connection = new DatabaseSync(file);
    try {
      this.connection.exec('PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;');
      if (!this.get("SELECT name FROM sqlite_master WHERE type = 'table' LIMIT 1"))
        this.transaction(() => this.connection.exec(sqliteSchema));
      this.connection.exec('PRAGMA journal_mode = WAL; PRAGMA synchronous = FULL;');
    } catch (error) {
      this.close();
      throw error;
    }
  }

  private statement(sql: string) {
    let statement = this.statements.get(sql);
    if (!statement) {
      statement = this.connection.prepare(sql);
      this.statements.set(sql, statement);
    }
    return statement;
  }

  get<T>(sql: string, ...values: SQLInputValue[]) {
    return this.statement(sql).get(...values) as T | undefined;
  }

  all<T>(sql: string, ...values: SQLInputValue[]) {
    return this.statement(sql).all(...values) as T[];
  }

  run(sql: string, ...values: SQLInputValue[]) {
    return this.statement(sql).run(...values);
  }

  transaction<T>(operation: () => T): T {
    let started = false;
    try {
      this.connection.exec('BEGIN IMMEDIATE');
      started = true;
      const value = operation();
      this.connection.exec('COMMIT');
      return value;
    } catch (error) {
      if (started) {
        try {
          this.connection.exec('ROLLBACK');
        } catch {
          // SQLite can already have rolled back after an I/O failure.
        }
      }
      if (error instanceof WorkbenchError) throw error;
      throw new WorkbenchError('PERSISTENCE', '保存失败，请检查磁盘空间或目录权限；原数据已保留。');
    }
  }

  close() {
    this.statements.clear();
    this.connection.close();
  }
}
