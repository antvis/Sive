import type { SnippetContent } from '@shared/schema';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { SnippetRepo } from '../../../../src/main/db/repository/snippet-repo';
import { createTestDb } from '../../../helpers/db';

function makeSnippet(id: string, messageId: string, overrides = {}) {
  const now = new Date().toISOString();
  return {
    id,
    messageId,
    title: `snippet-${id}`,
    content: { question: 'q', summary: 's' } as SnippetContent,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

describe('SnippetRepo', () => {
  let testDb: Awaited<ReturnType<typeof createTestDb>>;
  let repo: SnippetRepo;

  beforeEach(async () => {
    testDb = await createTestDb();
    repo = new SnippetRepo(testDb.database);
  });

  afterEach(() => testDb.close());

  it('inserts and reads back a snippet', () => {
    repo.insert(makeSnippet('s1', 'm1'));

    expect(repo.get('s1')).toMatchObject({ id: 's1', messageId: 'm1', title: 'snippet-s1' });
    expect(repo.get('missing')).toBeUndefined();
  });

  it('finds a snippet by message id', () => {
    repo.insert(makeSnippet('s1', 'm1'));

    expect(repo.getByMessageId('m1')?.id).toBe('s1');
    expect(repo.getByMessageId('missing')).toBeUndefined();
  });

  it('lists snippets ordered by updatedAt descending', () => {
    repo.insert(makeSnippet('s1', 'm1', { updatedAt: '2026-01-01T00:00:00.000Z' }));
    repo.insert(makeSnippet('s2', 'm2', { updatedAt: '2026-02-01T00:00:00.000Z' }));

    expect(repo.list().map((row) => row.id)).toEqual(['s2', 's1']);
  });

  it('lists ids by message ids and handles an empty input', () => {
    repo.insert(makeSnippet('s1', 'm1'));
    repo.insert(makeSnippet('s2', 'm2'));

    expect(repo.listIdsByMessageIds([])).toEqual([]);
    expect(repo.listIdsByMessageIds(['m1', 'm2', 'missing']).sort()).toEqual(['s1', 's2']);
  });

  it('updates fields and refreshes updatedAt', () => {
    repo.insert(makeSnippet('s1', 'm1', { updatedAt: '2026-01-01T00:00:00.000Z' }));

    const row = repo.update('s1', { title: 'renamed' });

    expect(row?.title).toBe('renamed');
    expect(row?.updatedAt).not.toBe('2026-01-01T00:00:00.000Z');
  });

  it('hard deletes a snippet', () => {
    repo.insert(makeSnippet('s1', 'm1'));

    repo.remove('s1');

    expect(repo.get('s1')).toBeUndefined();
  });
});
