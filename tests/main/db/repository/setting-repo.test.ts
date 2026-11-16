import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { SettingRepo } from '../../../../src/main/db/repository/setting-repo';
import { createTestDb } from '../../../helpers/db';

describe('SettingRepo', () => {
  let testDb: Awaited<ReturnType<typeof createTestDb>>;
  let repo: SettingRepo;

  beforeEach(async () => {
    testDb = await createTestDb();
    repo = new SettingRepo(testDb.database);
  });

  afterEach(() => testDb.close());

  it('returns undefined for a missing key', () => {
    expect(repo.get('missing')).toBeUndefined();
  });

  it('inserts and reads back a setting', () => {
    const now = new Date().toISOString();
    repo.insert({ key: 'theme', value: { mode: 'dark' }, createdAt: now, updatedAt: now });

    expect(repo.get('theme')).toMatchObject({ key: 'theme', value: { mode: 'dark' } });
  });

  it('defaults active model to an empty provider', () => {
    expect(repo.getActiveModel()).toEqual({ providerId: '' });
  });

  it('saves active model on first write and updates on subsequent writes', () => {
    repo.saveActiveModel({ providerId: 'p1', model: 'm1' });
    expect(repo.getActiveModel()).toEqual({ providerId: 'p1', model: 'm1' });

    repo.saveActiveModel({ providerId: 'p2', model: 'm2' });
    expect(repo.getActiveModel()).toEqual({ providerId: 'p2', model: 'm2' });
    expect(repo.list()).toHaveLength(1);
  });

  it('lists settings ordered by key', () => {
    const now = new Date().toISOString();
    repo.insert({ key: 'b', value: 2, createdAt: now, updatedAt: now });
    repo.insert({ key: 'a', value: 1, createdAt: now, updatedAt: now });

    expect(repo.list().map((row) => row.key)).toEqual(['a', 'b']);
  });

  it('soft deletes a setting so it is no longer visible', () => {
    const now = new Date().toISOString();
    repo.insert({ key: 'theme', value: { mode: 'dark' }, createdAt: now, updatedAt: now });

    repo.remove('theme');

    expect(repo.get('theme')).toBeUndefined();
    expect(repo.list()).toHaveLength(0);
  });

  it('ignores remove for a missing key', () => {
    expect(() => repo.remove('missing')).not.toThrow();
  });
});
