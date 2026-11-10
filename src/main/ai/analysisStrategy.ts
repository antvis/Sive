import { WorkbenchError } from '@shared/errors';
import type { AnalysisMode, AnalysisOptions } from '@shared/analysisOptions';

export function resolveStrategy(mode: AnalysisMode, options: AnalysisOptions = {}) {
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
