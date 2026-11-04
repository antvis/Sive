import { WorkbenchError } from '../shared/errors';
import type { AnalysisOptions } from '../shared/analysis-options';

export function resolveStrategy(mode: string, options: AnalysisOptions = {}) {
  if (mode !== 'direct' && mode !== 'loop')
    throw new WorkbenchError('INVALID_INPUT', '当前仅支持直接分析和多步探索，请重新选择分析方式。');
  if (!options || typeof options !== 'object' || Array.isArray(options))
    throw new WorkbenchError('INVALID_INPUT', '分析配置无效');
  const value = mode === 'direct' ? (options.maxRetries ?? 2) : (options.maxSteps ?? 6);
  const min = mode === 'direct' ? 0 : 3;
  const max = mode === 'direct' ? 5 : 12;
  if (!Number.isInteger(value) || value < min || value > max)
    throw new WorkbenchError(
      'INVALID_INPUT',
      mode === 'direct' ? '查询纠错次数需为 0–5 的整数' : '探索步数需为 3–12 的整数',
    );
  return mode === 'direct'
    ? { type: 'direct' as const, maxRetries: value }
    : { type: 'loop' as const, maxSteps: value };
}
