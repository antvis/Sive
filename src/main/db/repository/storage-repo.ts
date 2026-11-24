import { conversations, datasets, messages, snippets } from '../schema';
import type { DBConnection } from './db-connection';

export class StorageRepo {
  constructor(private database: DBConnection) {}

  clearWorkspace() {
    const { connection } = this.database;
    this.database.write(() => {
      connection.delete(snippets).run();
      connection.delete(messages).run();
      connection.delete(conversations).run();
      connection.delete(datasets).run();
    });
  }

  compactWorkspace() {
    const client = this.database.connection.$client;
    client.exec('VACUUM');
    const [checkpoint] = client.pragma('wal_checkpoint(TRUNCATE)') as { busy: number }[];
    if (checkpoint.busy) throw new Error('SQLite WAL checkpoint is busy');
  }
}
