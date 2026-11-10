import type { AnalysisMode } from '@shared/contracts';

export const analysisModes: { value: AnalysisMode; label: string; description: string }[] = [
  {
    value: 'direct',
    label: '直接分析',
    description: '每次查询直接生成并执行，适合明确的统计问题；需要模型支持工具调用。',
  },
  {
    value: 'loop',
    label: '多步探索',
    description: '每次查询先探索数据，再调整查询与核对结果；通常更慢、调用更多，需模型支持工具调用。',
  },
];
