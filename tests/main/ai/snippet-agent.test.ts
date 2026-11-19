import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { LanguageModel } from 'ai';
import { generateText } from 'ai';
import { generateInsightPresentation } from '../../../src/main/ai/snippet-agent';

vi.mock('ai', async (importOriginal) => ({
  ...(await importOriginal<typeof import('ai')>()),
  generateText: vi.fn(),
}));

const input = {
  model: {} as LanguageModel,
  question: '对比前5个月的销售额',
  query: '按月份比较销售额',
  summary: '销售额为 120万元。',
  spec: { type: 'column' as const, title: '月度销售额', data: [{ category: '一月', value: 120 }] },
};
const presentation = {
  intent: '趋势观察',
  tags: ['月度'],
  summaryT8: '销售额为 [120万元](metric_value)。',
  titleHighlights: ['销售额'],
};

describe('AI insight presentation', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => vi.restoreAllMocks());

  it('generates all presentation fields in one call with the original question and evidence', async () => {
    vi.mocked(generateText).mockResolvedValue({
      output: { ...presentation, tags: ['月度', '月度'] },
    } as never);
    expect(await generateInsightPresentation(input)).toEqual(presentation);
    expect(generateText).toHaveBeenCalledTimes(1);
    const request = vi.mocked(generateText).mock.calls[0][0];
    expect(JSON.parse(request.prompt as string)).toEqual({
      question: input.question,
      query: input.query,
      summary: input.summary,
      chart: input.spec,
    });
  });

  it('returns no presentation when the provider fails', async () => {
    vi.mocked(generateText).mockRejectedValueOnce(new Error('provider unavailable'));

    expect(await generateInsightPresentation(input)).toBeUndefined();
  });

  it('propagates cancellation instead of treating it as a formatting fallback', async () => {
    const controller = new AbortController();
    const error = new Error('cancelled');
    controller.abort();
    vi.mocked(generateText).mockRejectedValue(error);
    await expect(generateInsightPresentation({ ...input, abortSignal: controller.signal })).rejects.toBe(
      error,
    );
  });

  it('includes the complete output contract when the provider only supports JSON mode', async () => {
    const actual = await vi.importActual<typeof import('ai')>('ai');
    vi.mocked(generateText).mockImplementationOnce(actual.generateText);

    const summary = 'Female 1st class: 139 of 144 passengers survived (96.5%).';
    const presentation = {
      intent: '分类比较',
      tags: ['生存率'],
      summaryT8: 'Female 1st class: 139 of 144 passengers survived ([96.5%](ratio_value)).',
      titleHighlights: ['Survival Rate'],
    };
    let request: { response_format: unknown; messages: { role: string; content: string }[] } | undefined;
    const provider = createOpenAICompatible({
      name: 'sive',
      baseURL: 'https://provider.test/v1',
      fetch: async (_url, options) => {
        request = JSON.parse(options!.body as string);
        return Response.json({
          id: 'test',
          object: 'chat.completion',
          created: 0,
          model: 'test',
          choices: [
            {
              index: 0,
              message: { role: 'assistant', content: JSON.stringify(presentation) },
              finish_reason: 'stop',
            },
          ],
          usage: { prompt_tokens: 10, completion_tokens: 10, total_tokens: 20 },
        });
      },
    });

    expect(
      await generateInsightPresentation({
        model: provider.chatModel('test'),
        question: 'Compare survival by sex and class',
        query: 'Survival rate by sex and pclass',
        summary,
        spec: { type: 'column', title: 'Titanic Survival Rate by Sex and Passenger Class', data: [] },
      }),
    ).toEqual(presentation);
    expect(request?.response_format).toEqual({ type: 'json_object' });
    const system = request?.messages.find((message) => message.role === 'system')?.content;
    for (const key of ['intent', 'tags', 'summaryT8', 'titleHighlights']) {
      expect(system).toContain(`"${key}"`);
    }
  });
});
