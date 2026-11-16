import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ModelProviderRepo } from '../../../../src/main/db/repository/model-provider-repo';
import { createTestDb } from '../../../helpers/db';

function makeProvider(id: string, overrides = {}) {
  const now = new Date().toISOString();
  return {
    id,
    name: `provider-${id}`,
    modelNames: ['m1'],
    baseUrl: 'https://example.com',
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

describe('ModelProviderRepo', () => {
  let testDb: Awaited<ReturnType<typeof createTestDb>>;
  let repo: ModelProviderRepo;

  beforeEach(async () => {
    testDb = await createTestDb();
    repo = new ModelProviderRepo(testDb.database);
  });

  afterEach(() => testDb.close());

  it('inserts and reads back a provider', () => {
    repo.insert(makeProvider('p1'));

    expect(repo.get('p1')).toMatchObject({ id: 'p1', name: 'provider-p1', modelNames: ['m1'] });
    expect(repo.get('missing')).toBeUndefined();
  });

  it('lists providers ordered by createdAt ascending', () => {
    repo.insert(makeProvider('p1', { createdAt: '2026-02-01T00:00:00.000Z' }));
    repo.insert(makeProvider('p2', { createdAt: '2026-01-01T00:00:00.000Z' }));

    expect(repo.list().map((row) => row.id)).toEqual(['p2', 'p1']);
  });

  it('updates fields and refreshes updatedAt', () => {
    repo.insert(makeProvider('p1', { updatedAt: '2026-01-01T00:00:00.000Z' }));

    const row = repo.update('p1', { modelNames: ['m1', 'm2'] });

    expect(row?.modelNames).toEqual(['m1', 'm2']);
    expect(row?.updatedAt).not.toBe('2026-01-01T00:00:00.000Z');
  });

  it('soft deletes a provider so it is no longer visible', () => {
    repo.insert(makeProvider('p1'));

    repo.remove('p1');

    expect(repo.get('p1')).toBeUndefined();
    expect(repo.list()).toHaveLength(0);
  });

  it('ignores remove for a missing id', () => {
    expect(() => repo.remove('missing')).not.toThrow();
  });
});
