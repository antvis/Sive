import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { SnippetSaveInput } from '../../../../src/shared/schema';
import { createRepositories } from '../../../../src/main/db/repository';
import { SnippetService } from '../../../../src/main/services/snippet';
import { createTestDb } from '../../../helpers/db';

const input: SnippetSaveInput = {
  messageId: 'message-1',
  question: '对比前5个月的销售额',
  intent: '趋势观察',
  title: '月度[销售额](metric_name)',
  summary: '销售额为 [120万元](metric_value)。',
  spec: { type: 'column', title: '月度销售额', data: [{ category: '一月', value: 120 }] },
  tags: ['月度'],
  metrics: [{ label: '一月销售额', value: '120', unit: '万元' }],
};

describe('SnippetService', () => {
  let testDb: Awaited<ReturnType<typeof createTestDb>>;
  let service: SnippetService;

  beforeEach(async () => {
    testDb = await createTestDb();
    const repositories = createRepositories(testDb.database);
    const now = new Date().toISOString();
    repositories.messages.insert({
      id: input.messageId,
      conversationId: 'conversation-1',
      sequence: 0,
      role: 'assistant',
      parts: [],
      createdAt: now,
      updatedAt: now,
    });
    service = new SnippetService(testDb.database, repositories);
  });

  afterEach(() => testDb.close());

  it('persists content and metrics without changing T8 and saves each message once', () => {
    const saved = service.save(input);
    expect(saved).toMatchObject({ ...input, templateId: 'default' });
    expect(service.list()).toEqual([saved]);
    expect(service.save({ ...input, title: '另一个标题' })).toEqual(saved);
  });

  it('edits T8 text without changing the question, intent, tags or chart', () => {
    const saved = service.save(input);
    const edits = { title: '我的[销售额](metric_name)', summary: '收入为 [100万元](metric_value)。' };
    service.update(input.messageId, { title: edits.title });
    expect(service.list()[0]).toEqual({ ...saved, title: edits.title, updatedAt: expect.any(String) });
    service.update(input.messageId, { summary: edits.summary });
    expect(service.list()[0]).toEqual({ ...saved, ...edits, updatedAt: expect.any(String) });
  });

  it('changes only the template without changing the snippet content', () => {
    const saved = service.save(input);
    service.update(input.messageId, { templateId: 'pop' });
    expect(service.list()[0]).toEqual({ ...saved, templateId: 'pop', updatedAt: expect.any(String) });
  });

  it('stores Summary chart specs independently from the T8 title and summary', () => {
    const spec = '收入为 [120万元](metric_value)。';
    const saved = service.save({ ...input, spec });
    expect(saved).toMatchObject({ ...input, spec });
    expect(service.list()[0]).toEqual(saved);
  });

  it('saves snippets without reliable metrics and keeps the chart when switching templates', () => {
    const saved = service.save({ ...input, metrics: [] });
    service.update(input.messageId, { templateId: 'circuit' });
    expect(service.list()[0]).toEqual({ ...saved, templateId: 'circuit', updatedAt: expect.any(String) });
  });

  it('rejects a missing source message', () => {
    expect(() => service.save({ ...input, messageId: 'missing' })).toThrow('分析消息不存在。');
    expect(service.list()).toEqual([]);
  });

  it('keeps saved content intact when an edit has an empty title', () => {
    const saved = service.save(input);
    expect(() => service.update(input.messageId, { title: ' ', summary: '新洞察' })).toThrow(
      '标题不能为空。',
    );
    expect(service.list()[0]).toEqual(saved);
  });
});
