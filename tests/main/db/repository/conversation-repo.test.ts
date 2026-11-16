import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ConversationRepo } from '../../../../src/main/db/repository/conversation-repo';
import { createTestDb } from '../../../helpers/db';

function makeConversation(id: string, overrides = {}) {
  const now = new Date().toISOString();
  return {
    id,
    datasetId: 'd1',
    title: `conversation-${id}`,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

describe('ConversationRepo', () => {
  let testDb: Awaited<ReturnType<typeof createTestDb>>;
  let repo: ConversationRepo;

  beforeEach(async () => {
    testDb = await createTestDb();
    repo = new ConversationRepo(testDb.database);
  });

  afterEach(() => testDb.close());

  it('inserts and reads back a conversation', () => {
    repo.insert(makeConversation('c1'));

    expect(repo.get('c1')).toMatchObject({ id: 'c1', datasetId: 'd1', title: 'conversation-c1' });
    expect(repo.get('missing')).toBeUndefined();
  });

  it('lists active conversations ordered by createdAt descending', () => {
    repo.insert(makeConversation('c1', { createdAt: '2026-01-01T00:00:00.000Z' }));
    repo.insert(makeConversation('c2', { createdAt: '2026-02-01T00:00:00.000Z' }));

    expect(repo.list().map((row) => row.id)).toEqual(['c2', 'c1']);
  });

  it('separates archived conversations from the active list', () => {
    repo.insert(makeConversation('c1'));
    repo.insert(makeConversation('c2', { archivedAt: new Date().toISOString() }));

    expect(repo.list().map((row) => row.id)).toEqual(['c1']);
    expect(repo.listArchived().map((row) => row.id)).toEqual(['c2']);
  });

  it('lists conversations by dataset id', () => {
    repo.insert(makeConversation('c1'));
    repo.insert(makeConversation('c2', { datasetId: 'd2' }));

    expect(repo.listByDatasetId('d2').map((row) => row.id)).toEqual(['c2']);
    expect(repo.listByDatasetId('d1').map((row) => row.id)).toEqual(['c1']);
  });

  it('updates fields and refreshes updatedAt', () => {
    repo.insert(makeConversation('c1', { updatedAt: '2026-01-01T00:00:00.000Z' }));

    const row = repo.update('c1', { title: 'renamed' });

    expect(row?.title).toBe('renamed');
    expect(row?.updatedAt).not.toBe('2026-01-01T00:00:00.000Z');
  });

  it('hard deletes a conversation', () => {
    repo.insert(makeConversation('c1'));

    repo.remove('c1');

    expect(repo.get('c1')).toBeUndefined();
  });
});
