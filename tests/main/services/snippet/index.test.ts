import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { SnippetSaveInput } from '../../../../src/shared/schema';
import { createRepositories } from '../../../../src/main/db/repository';
import { SnippetService } from '../../../../src/main/services/snippet';
import { createTestDb } from '../../../helpers/db';

const input: SnippetSaveInput = {
  messageId: 'message-1',
  question: '对比前5个月的销售额',
  summary: '销售额为 120万元。',
  spec: { type: 'column', title: '月度销售额', data: [{ category: '一月', value: 120 }] },
  presentation: {
    intent: '趋势观察',
    tags: ['月度'],
    summaryT8: '销售额为 [120万元](metric_value)。',
    titleHighlights: ['销售额'],
  },
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
      status: 'done',
      content: {},
      createdAt: now,
      updatedAt: now,
    });
    service = new SnippetService(testDb.database, repositories);
  });

  afterEach(() => testDb.close());

  it('persists unique tags and the chart title while retaining the original question', () => {
    const saved = service.save({
      ...input,
      presentation: { ...input.presentation!, tags: ['月度', '月度'] },
    });
    expect(saved.title).toBe('月度销售额');
    expect(service.list()[0].content).toMatchObject({
      question: input.question,
      presentation: input.presentation,
    });
    expect(service.save(input)).toEqual(saved);
  });

  it('retains T8 on a title-only edit and clears obsolete title highlights', () => {
    service.save(input);
    service.update(input.messageId, { title: '我的标题', summary: input.summary });
    const saved = service.list()[0];
    expect(saved.title).toBe('我的标题');
    expect(saved.content.question).toBe(input.question);
    expect(saved.content.presentation).toEqual({ ...input.presentation, titleHighlights: [] });
  });

  it('invalidates presentation after editing the underlying insight', () => {
    service.save(input);
    service.update(input.messageId, { title: '月度销售额', summary: '已人工修改洞察。' });
    const saved = service.list()[0];
    expect(saved.content.summary).toBe('已人工修改洞察。');
    expect(saved.content.presentation).toBeUndefined();
    expect(saved.content.question).toBe(input.question);
  });

  it('accepts old snippets without presentation metadata', () => {
    service.save({ ...input, presentation: undefined });
    expect(service.list()[0].content).toEqual({
      question: input.question,
      summary: input.summary,
      spec: input.spec,
    });
  });

  it('saves Summary visualizations using the original question as their title', () => {
    service.save({ ...input, spec: '收入为 [120万元](metric_value)。', presentation: undefined });
    expect(service.list()[0].title).toBe(input.question);
    expect(service.list()[0].content.spec).toBe('收入为 [120万元](metric_value)。');
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
