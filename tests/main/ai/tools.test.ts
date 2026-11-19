import { describe, expect, it, vi } from 'vitest';
import type { AVA } from '@antv/ava';
import { createTools } from '../../../src/main/ai/tools';
import type { ToolContext } from '../../../src/main/ai/tools';

describe('visualize presentation integration', () => {
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
    const present = vi.fn().mockResolvedValue(presentation);
    const tools = createTools(ava as unknown as AVA, {} as ToolContext, () => ({ type: 'direct' }), present);
    const options = { toolCallId: 'call', messages: [], abortSignal: new AbortController().signal };
    expect(await tools.visualize.execute!({}, options)).toBeNull();
    expect(present).not.toHaveBeenCalled();
    await tools.analyze.execute!({ query: '月度变化' }, options);
    expect(await tools.visualize.execute!({}, options)).toEqual({
      question: analysis.query,
      summary: analysis.text,
      spec: chart.config,
      presentation,
    });
    expect(present).toHaveBeenCalledExactlyOnceWith(analysis, chart.config, options.abortSignal);
    ava.visualize.mockResolvedValueOnce(null);
    expect(await tools.visualize.execute!({}, options)).toBeNull();
    expect(present).toHaveBeenCalledTimes(1);
  });
});
