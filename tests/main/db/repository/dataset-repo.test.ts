import type { DataSourceConfig, Profile, Schema, Semantic } from '@antv/ava';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DatasetRepo } from '../../../../src/main/db/repository/dataset-repo';
import { createTestDb } from '../../../helpers/db';

// sourceConfig is encrypted with Electron safeStorage; use a plain base64 round-trip in tests.
vi.mock('electron', () => ({
  safeStorage: {
    isEncryptionAvailable: () => true,
    encryptString: (value: string) => Buffer.from(value),
    decryptString: (value: Buffer) => value.toString(),
  },
}));

function makeDataset(id: string, overrides = {}) {
  const now = new Date().toISOString();
  return {
    id,
    name: `dataset-${id}`,
    sourceType: 'csv',
    sourceConfig: { type: 'csv' } as DataSourceConfig,
    schema: {} as Schema,
    profile: {} as Profile,
    semantic: {} as Semantic,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

describe('DatasetRepo', () => {
  let testDb: Awaited<ReturnType<typeof createTestDb>>;
  let repo: DatasetRepo;

  beforeEach(async () => {
    testDb = await createTestDb();
    repo = new DatasetRepo(testDb.database);
  });

  afterEach(() => testDb.close());

  it('returns undefined for a missing id', () => {
    expect(repo.get('missing')).toBeUndefined();
  });

  it('inserts and reads back a dataset with a decrypted source config', () => {
    repo.insert(makeDataset('d1'));

    const row = repo.get('d1');
    expect(row).toMatchObject({ id: 'd1', name: 'dataset-d1', sourceConfig: { type: 'csv' } });
  });

  it('lists datasets ordered by updatedAt descending', () => {
    repo.insert(makeDataset('d1', { updatedAt: '2026-01-01T00:00:00.000Z' }));
    repo.insert(makeDataset('d2', { updatedAt: '2026-02-01T00:00:00.000Z' }));

    expect(repo.list().map((row) => row.id)).toEqual(['d2', 'd1']);
  });

  it('updates fields and refreshes updatedAt', () => {
    repo.insert(makeDataset('d1', { updatedAt: '2026-01-01T00:00:00.000Z' }));

    const row = repo.update('d1', { name: 'renamed' });

    expect(row?.name).toBe('renamed');
    expect(row?.updatedAt).not.toBe('2026-01-01T00:00:00.000Z');
  });

  it('soft deletes a dataset so it is no longer visible', () => {
    repo.insert(makeDataset('d1'));

    repo.remove('d1');

    expect(repo.get('d1')).toBeUndefined();
    expect(repo.list()).toHaveLength(0);
  });

  it('ignores remove for a missing id', () => {
    expect(() => repo.remove('missing')).not.toThrow();
  });
});
