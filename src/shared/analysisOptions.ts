import type { z } from 'zod';
import type { analysisModeSchema, analysisOptionsSchema } from '@shared/inputSchemas';
export type AnalysisMode = z.infer<typeof analysisModeSchema>;
export type AnalysisOptions = z.infer<typeof analysisOptionsSchema>;
export const analysisModes = [
  { value: 'direct' as const, label: '直接分析', description: '适合明确的统计问题：生成查询、计算并总结。' },
  {
    value: 'loop' as const,
    label: '多步探索',
    description: '适合需要逐步排查的问题：先探索数据，再调整查询与核对结果。通常更慢、调用更多。',
  },
  {
    value: 'agent' as const,
    label: '智能分析',
    description: '按需补查、核对和绘图，支持引用历史结果；需要模型支持工具调用。',
  },
];
export function analysisLabel(mode: string) {
  return (
    analysisModes.find((item) => item.value === mode)?.label ||
    (mode === 'subset' ? '精简分析上下文（历史记录）' : mode)
  );
}
