import type { z } from 'zod';
import type { analysisModeSchema, analysisOptionsSchema } from '@shared/inputSchemas';
export type AnalysisMode = z.infer<typeof analysisModeSchema>;
export type AnalysisOptions = z.infer<typeof analysisOptionsSchema>;
export const analysisModes = [
  {
    value: 'direct' as const,
    label: '直接分析',
    description: '每次查询直接生成并执行，适合明确的统计问题；需要模型支持工具调用。',
  },
  {
    value: 'loop' as const,
    label: '多步探索',
    description: '每次查询先探索数据，再调整查询与核对结果；通常更慢、调用更多，需模型支持工具调用。',
  },
];
export function analysisLabel(mode: string) {
  return (
    analysisModes.find((item) => item.value === mode)?.label ||
    (mode === 'subset' ? '精简分析上下文（历史记录）' : mode)
  );
}
