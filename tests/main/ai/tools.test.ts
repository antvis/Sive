import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AnalysisStrategyConfig, AVA } from '@antv/ava';
import type { LanguageModel } from 'ai';
import { generateInsightPresentation } from '../../../src/main/ai/snippet-agent';
import { createTools } from '../../../src/main/ai/tools';
import type { ToolContext } from '../../../src/main/ai/tools';

vi.mock('../../../src/main/ai/snippet-agent', () => ({
  generateInsightPresentation: vi.fn(),
}));

describe('visualize presentation integration', () => {
  beforeEach(() => vi.resetAllMocks());

  it('only annotates an available visualization and forwards the cancellation signal', async () => {
    const analysis = { query: '月度变化', text: '销售额为 120万元。' };
    const chart = {
      chartType: 'column',
      config: { type: 'column', title: '销售额', data: [] },
      html: '<div>chart</div>',
    };
    const presentation = {
      intent: '趋势观察',
      tags: ['月度'],
      summaryT8: '销售额为 [120万元](metric_value)。',
      titleHighlights: ['销售额'],
    };
    const ava = { analyze: vi.fn().mockResolvedValue(analysis), visualize: vi.fn().mockResolvedValue(chart) };
    const model = {} as LanguageModel;
    const toolOptions = { strategy: { type: 'direct' as const }, question: '对比前5个月的销售额' };
    vi.mocked(generateInsightPresentation).mockResolvedValue(presentation);
    const tools = createTools(ava as unknown as AVA, {} as ToolContext, toolOptions, model);
    const options = { toolCallId: 'call', messages: [], abortSignal: new AbortController().signal };
    expect(await tools.visualize.execute!({}, options)).toBeNull();
    expect(generateInsightPresentation).not.toHaveBeenCalled();
    await tools.analyze.execute!({ query: '月度变化' }, options);
    expect(await tools.visualize.execute!({}, options)).toEqual({
      question: analysis.query,
      summary: analysis.text,
      spec: chart.config,
      presentation,
    });
    expect(generateInsightPresentation).toHaveBeenCalledExactlyOnceWith({
      model,
      question: toolOptions.question,
      query: analysis.query,
      summary: analysis.text,
      spec: chart.config,
      abortSignal: options.abortSignal,
    });
    ava.visualize.mockResolvedValueOnce(null);
    expect(await tools.visualize.execute!({}, options)).toBeNull();
    expect(generateInsightPresentation).toHaveBeenCalledTimes(1);
  });

  it('uses the updated strategy and original question for later turns', async () => {
    const analysis = { query: '按地区比较收入', text: '华东收入最高。' };
    const chart = { config: { type: 'column', title: '地区收入', data: [] } };
    const ava = { analyze: vi.fn().mockResolvedValue(analysis), visualize: vi.fn().mockResolvedValue(chart) };
    const toolOptions: { strategy: AnalysisStrategyConfig; question: string } = {
      strategy: { type: 'direct' },
      question: '查看收入',
    };
    const tools = createTools(ava as unknown as AVA, {} as ToolContext, toolOptions, {} as LanguageModel);
    const options = { toolCallId: 'call', messages: [] };

    await tools.analyze.execute!({ query: '收入' }, options);
    await tools.visualize.execute!({}, options);
    expect(ava.analyze).toHaveBeenLastCalledWith('收入', { strategy: { type: 'direct' } });
    expect(generateInsightPresentation).toHaveBeenLastCalledWith(
      expect.objectContaining({ question: '查看收入' }),
    );

    toolOptions.strategy = { type: 'loop', maxSteps: 5 };
    toolOptions.question = '哪个地区收入最高？';
    await tools.analyze.execute!({ query: analysis.query }, options);
    await tools.visualize.execute!({}, options);
    expect(ava.analyze).toHaveBeenLastCalledWith(analysis.query, {
      strategy: { type: 'loop', maxSteps: 5 },
    });
    expect(generateInsightPresentation).toHaveBeenLastCalledWith(
      expect.objectContaining({ question: '哪个地区收入最高？' }),
    );
  });
});
