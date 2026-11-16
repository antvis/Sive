import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { DBConnection } from '../../src/main/db/repository/db-connection';

export async function createTestDb() {
  const root = mkdtempSync(path.join(tmpdir(), 'sive-test-'));
  const database = await DBConnection.connect(root);

  return {
    database,
    close() {
      database.close();
      rmSync(root, { recursive: true, force: true });
    },
  };
}
