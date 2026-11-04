import { WorkbenchError } from '../shared/errors';
import type { ChartSpec } from '@antv/ava';
import { generateText, type LanguageModel } from 'ai';

// Refresh an existing visualization without asking AVA to recommend a new type.
export async function refreshChart(
  original: ChartSpec,
  data: Record<string, unknown>[],
  question: string,
  model?: LanguageModel,
): Promise<ChartSpec> {
  if (original.chartType === 'table') {
    return { ...original, config: { ...original.config, type: 'table', data } };
  }
  if (!model) throw new WorkbenchError('MODEL', '请先配置用于更新图表的模型');
  const { text } = await generateText({
    model,
    maxRetries: 0,
    prompt: `更新已有 GPT-Vis 图表的数据。只输出完整 JSON 配置，不要重新选择图表类型。
必须保持 type 为 ${original.chartType}，保持原图的字段含义、系列类型、单位、标题和样式；只根据新查询结果更新数据及对应分类。不要沿用旧数值，也不要增加新指标。数值字段使用 number。
原始问题：${question}
原始图表配置：${JSON.stringify(original.config)}
新查询结果：${JSON.stringify(data)}`,
  });
  const config = JSON.parse(
    text
      .trim()
      .replace(/^```(?:json)?\s*\n?/i, '')
      .replace(/\n?\s*```$/, ''),
  );
  if (!config || typeof config !== 'object' || Array.isArray(config) || config.type !== original.chartType)
    throw new WorkbenchError('MODEL', '刷新结果改变了原图类型，本次更新已拒绝');
  return { chartType: original.chartType, config };
}
