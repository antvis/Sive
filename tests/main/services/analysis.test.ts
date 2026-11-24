import type { UIMessageChunk } from 'ai';
import { beforeEach, expect, it, vi } from 'vitest';
import { createAnalysisAgent } from '../../../src/main/ai';
import { generateConversationTitle } from '../../../src/main/ai/completions';
import { createRepositories } from '../../../src/main/db/repository';
import { AnalysisService } from '../../../src/main/services/analysis';
import { ConversationService } from '../../../src/main/services/conversation';
import type { AnalysisToolOutput } from '../../../src/shared/analysis-trace';
import { DEFAULT_PREFERENCES } from '../../../src/shared/api';
import { createTestDb } from '../../helpers/db';

vi.mock('../../../src/main/ai', () => ({ createAnalysisAgent: vi.fn() }));
vi.mock('../../../src/main/ai/completions', () => ({ generateConversationTitle: vi.fn() }));
vi.mock('electron', () => ({
  safeStorage: {
    isEncryptionAvailable: () => true,
    encryptString: (value: string) => Buffer.from(value),
    decryptString: (value: Buffer) => value.toString(),
  },
}));

beforeEach(() => vi.mocked(generateConversationTitle).mockReset().mockResolvedValue(undefined));

function seedDataset(repositories: ReturnType<typeof createRepositories>) {
  const now = new Date().toISOString();
  return repositories.datasets.insert({
    id: 'sales',
    name: '销量',
    sourceType: 'csv',
    sourceConfig: { type: 'csv', options: { path: 'https://example.com/sales.csv' } },
    schema: { models: [] },
    profile: { models: [] },
    semantic: {},
    createdAt: now,
    updatedAt: now,
  });
}

it('streams the analysis trace with the tool result before the reply ends', async () => {
  const testDb = await createTestDb();
  try {
    const repositories = createRepositories(testDb.database);
    const dataset = seedDataset(repositories);
    const query = '销量是多少？';
    const strategy = { type: 'direct' } as const;
    const output: AnalysisToolOutput = {
      result: { query, text: '销量为 10。', data: [], schema: [] },
      trace: {
        toolCallId: 'analysis',
        query,
        strategy,
        start: { datasetId: dataset.id },
        status: 'completed',
        steps: [],
      },
    };
    const toolResult = {
      type: 'tool-output-available',
      toolCallId: output.trace.toolCallId,
      output,
    } as const;
    const reply = { type: 'text-delta', id: 'reply', delta: '销量为 10。' } as const;
    vi.mocked(createAnalysisAgent).mockResolvedValue({
      stream: async () => ReadableStream.from([toolResult, reply]),
      dispose: async () => {},
    });
    const service = new AnalysisService(testDb.database, repositories);
    const chunks: (UIMessageChunk | null)[] = [];
    await new Promise<void>((resolve) => {
      service.start(
        {
          chatId: 'chat',
          datasetId: dataset.id,
          strategy,
          message: { id: 'user', role: 'user', parts: [{ type: 'text', text: query }] },
        },
        { baseURL: 'https://example.com', model: 'test' },
        DEFAULT_PREFERENCES,
        (chunk) => {
          chunks.push(chunk);
          if (chunk === null) resolve();
        },
      );
    });
    expect(chunks).toEqual([toolResult, reply, null]);
  } finally {
    testDb.close();
  }
});

const question = '请比较过去三个月的销量变化';
const generatedTitle = '💡 近三个月销量趋势';

it.each([
  { scenario: 'names a new conversation', expected: generatedTitle },
  { scenario: 'names an existing empty draft', draft: true, expected: generatedTitle },
  { scenario: 'preserves a manual rename', manualTitle: '新建分析', expected: '新建分析' },
  { scenario: 'keeps the question if generation has no title', noTitle: true, expected: question },
])('$scenario after the first question', async ({ draft, manualTitle, noTitle, expected }) => {
  const testDb = await createTestDb();
  try {
    const repositories = createRepositories(testDb.database);
    const dataset = seedDataset(repositories);
    const conversations = new ConversationService(testDb.database, repositories);
    const chatId = draft ? conversations.create(dataset.id).id : 'chat';
    const service = new AnalysisService(testDb.database, repositories);
    const model = { baseURL: 'https://example.com', model: 'test' };
    const generation = Promise.withResolvers<string | undefined>();
    vi.mocked(generateConversationTitle).mockReturnValue(generation.promise);
    vi.mocked(createAnalysisAgent).mockResolvedValue({
      stream: async () => ReadableStream.from([]),
      dispose: async () => {},
    });

    const send = (id: string, text: string) => {
      const finished = Promise.withResolvers<void>();
      const titleUpdate = service.start(
        {
          chatId,
          datasetId: dataset.id,
          strategy: { type: 'direct' },
          message: { id, role: 'user', parts: [{ type: 'text', text }] },
        },
        model,
        DEFAULT_PREFERENCES,
        (chunk) => {
          if (chunk === null) finished.resolve();
        },
      );
      return { titleUpdate, finished: finished.promise };
    };

    const first = send('first', question);
    expect(repositories.conversations.get(chatId)?.title).toBe(question);
    expect(service.getMessages(chatId)).toHaveLength(1);
    await first.finished;

    if (manualTitle) conversations.rename(chatId, manualTitle);
    generation.resolve(noTitle ? undefined : generatedTitle);
    expect(await first.titleUpdate).toBe(expected === generatedTitle);

    const followUp = send('follow-up', '再按产品分类');
    expect(followUp.titleUpdate).toBeUndefined();
    await followUp.finished;
    expect(generateConversationTitle).toHaveBeenCalledExactlyOnceWith(question, model);
    expect(repositories.conversations.get(chatId)?.title).toBe(expected);
  } finally {
    testDb.close();
  }
});
