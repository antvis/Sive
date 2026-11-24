import { expect, it, vi } from 'vitest';
import { createRepositories } from '../../../src/main/db/repository';
import { conversations, datasets, messages, snippets } from '../../../src/main/db/schema';
import { StorageService } from '../../../src/main/services/storage';
import { createTestDb } from '../../helpers/db';

vi.mock('electron', () => ({
  safeStorage: {
    isEncryptionAvailable: () => true,
    encryptString: (value: string) => Buffer.from(value),
    decryptString: (value: Buffer) => value.toString(),
  },
}));

it('permanently clears workbench records and recovers space while keeping configuration', async () => {
  const { database, close } = await createTestDb();
  try {
    const repositories = createRepositories(database);
    const now = new Date().toISOString();
    const timestamps = { createdAt: now, updatedAt: now };
    repositories.datasets.insert({
      id: 'data',
      name: 'Saved data source',
      sourceType: 'csv',
      sourceConfig: { type: 'csv', options: { path: '/tmp/sive-storage-fixture.csv' } },
      schema: { models: [] },
      profile: { models: [] },
      semantic: {},
      ...timestamps,
    });
    repositories.conversations.insert({
      id: 'chat',
      datasetId: 'data',
      title: 'Archived conversation',
      archivedAt: now,
      ...timestamps,
    });
    repositories.messages.insert({
      id: 'message',
      conversationId: 'chat',
      sequence: 0,
      role: 'user',
      parts: [{ type: 'text', text: 'x'.repeat(128 * 1024) }],
      ...timestamps,
    });
    repositories.snippets.insert({
      id: 'snippet',
      messageId: 'message',
      title: 'Favorite',
      question: 'Which month had the highest sales?',
      intent: 'Compare monthly sales',
      summary: 'January',
      spec: { type: 'column', data: [{ month: 'January', sales: 100 }] },
      tags: [],
      metrics: [],
      templateId: 'default',
      ...timestamps,
    });
    repositories.modelProviders.insert({
      id: 'provider',
      name: 'Provider',
      modelNames: ['model'],
      baseUrl: 'https://example.com',
      ...timestamps,
    });
    repositories.settings.saveActiveModel({ providerId: 'provider', model: 'model' });
    repositories.settings.insert({ key: 'language', value: 'en-US', ...timestamps });
    const { connection } = database;
    const client = connection.$client;
    const pagesBefore = client.pragma('page_count', { simple: true });

    const storage = new StorageService(repositories.storage);
    storage.clearWorkspace();
    storage.clearWorkspace();

    for (const table of [datasets, conversations, messages, snippets]) {
      expect(connection.select().from(table).all()).toEqual([]);
    }
    expect(client.pragma('page_count', { simple: true })).toBeLessThan(pagesBefore as number);
    expect(repositories.modelProviders.get('provider')?.modelNames).toEqual(['model']);
    expect(repositories.settings.getActiveModel()).toEqual({ providerId: 'provider', model: 'model' });
    expect(repositories.settings.get('language')?.value).toBe('en-US');
  } finally {
    close();
  }
});
