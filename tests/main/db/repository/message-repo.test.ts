import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { MessageRepo } from '../../../../src/main/db/repository/message-repo';
import { createTestDb } from '../../../helpers/db';

function makeMessage(id: string, sequence: number, overrides = {}) {
  const now = new Date().toISOString();
  return {
    id,
    conversationId: 'c1',
    sequence,
    role: 'user' as const,
    status: 'done' as const,
    content: {},
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

describe('MessageRepo', () => {
  let testDb: Awaited<ReturnType<typeof createTestDb>>;
  let repo: MessageRepo;

  beforeEach(async () => {
    testDb = await createTestDb();
    repo = new MessageRepo(testDb.database);
  });

  afterEach(() => testDb.close());

  it('inserts and reads back a message', () => {
    repo.insert(makeMessage('m1', 0));

    expect(repo.get('m1')).toMatchObject({ id: 'm1', conversationId: 'c1', sequence: 0 });
    expect(repo.get('missing')).toBeUndefined();
  });

  it('lists messages of a conversation ordered by sequence', () => {
    repo.insert(makeMessage('m2', 1));
    repo.insert(makeMessage('m1', 0));
    repo.insert(makeMessage('m3', 0, { conversationId: 'c2' }));

    expect(repo.listByConversationId('c1').map((row) => row.id)).toEqual(['m1', 'm2']);
  });

  it('starts sequence at 0 for an empty conversation and increments afterwards', () => {
    expect(repo.nextSequence('c1')).toBe(0);

    repo.insert(makeMessage('m1', 0));
    repo.insert(makeMessage('m2', 1));

    expect(repo.nextSequence('c1')).toBe(2);
    expect(repo.nextSequence('c2')).toBe(0);
  });

  it('updates fields and refreshes updatedAt', () => {
    repo.insert(makeMessage('m1', 0, { updatedAt: '2026-01-01T00:00:00.000Z' }));

    const row = repo.update('m1', { status: 'error' });

    expect(row?.status).toBe('error');
    expect(row?.updatedAt).not.toBe('2026-01-01T00:00:00.000Z');
  });

  it('hard deletes all messages of a conversation', () => {
    repo.insert(makeMessage('m1', 0));
    repo.insert(makeMessage('m2', 1));
    repo.insert(makeMessage('m3', 0, { conversationId: 'c2' }));

    repo.removeByConversationId('c1');

    expect(repo.listByConversationId('c1')).toHaveLength(0);
    expect(repo.listByConversationId('c2')).toHaveLength(1);
  });
});
