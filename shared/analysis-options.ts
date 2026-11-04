export type AnalysisMode = 'direct' | 'loop';
export type AnalysisOptions = { maxRetries?: number; maxSteps?: number };
export const analysisModes = [
  { value: 'direct' as const, label: '直接分析', description: '适合明确的统计问题：生成查询、计算并总结。' },
  {
    value: 'loop' as const,
    label: '多步探索',
    description: '适合需要逐步排查的问题：先探索数据，再调整查询与核对结果。通常更慢、调用更多。',
  },
];
export function analysisLabel(mode: string) {
  return (
    analysisModes.find((item) => item.value === mode)?.label ||
    (mode === 'subset' ? '精简分析上下文（历史记录）' : mode)
  );
}
