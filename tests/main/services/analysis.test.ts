import { expect, it, vi } from 'vitest';
import { createAnalysisAgent } from '../../../src/main/ai';
import { createRepositories } from '../../../src/main/db/repository';
import { AnalysisService } from '../../../src/main/services/analysis';
import type { AnalysisToolOutput } from '../../../src/shared/analysis-trace';
import { DEFAULT_PREFERENCES } from '../../../src/shared/api';
import type { AnalysisUpdate } from '../../../src/shared/api';
import { createTestDb } from '../../helpers/db';

vi.mock('../../../src/main/ai', () => ({ createAnalysisAgent: vi.fn() }));
vi.mock('electron', () => ({
  safeStorage: {
    isEncryptionAvailable: () => true,
    encryptString: (value: string) => Buffer.from(value),
    decryptString: (value: Buffer) => value.toString(),
  },
}));

it('streams the analysis trace with the tool result before the reply ends', async () => {
  const testDb = await createTestDb();
  try {
    const repositories = createRepositories(testDb.database);
    const now = new Date().toISOString();
    const dataset = repositories.datasets.insert({
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
      stream: async () =>
        ReadableStream.from([
          {
            type: 'tool-input-available',
            toolCallId: output.trace.toolCallId,
            toolName: 'analyze',
            input: { query },
          },
          toolResult,
          { type: 'text-start', id: 'reply' },
          reply,
        ]),
      dispose: async () => {},
    });
    const service = new AnalysisService(testDb.database, repositories);
    const chunks: AnalysisUpdate[] = [];
    await new Promise<void>((resolve) => {
      service.onUpdate((_id, chunk) => {
        chunks.push(chunk);
        if (!chunk.running) resolve();
      });
      service.start(
        {
          chatId: 'chat',
          datasetId: dataset.id,
          strategy,
          message: { id: 'user', role: 'user', parts: [{ type: 'text', text: query }] },
        },
        { baseURL: 'https://example.com', model: 'test' },
        DEFAULT_PREFERENCES,
      );
    });
    expect(
      chunks.some(
        ({ running, message }) =>
          running &&
          message?.parts.some((part) => part.type === 'tool-analyze' && part.state === 'output-available') &&
          !message.parts.some((part) => part.type === 'text' && part.text),
      ),
    ).toBe(true);
  } finally {
    testDb.close();
  }
});
