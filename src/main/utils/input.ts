import type { z } from 'zod';
import { WorkbenchError } from '@shared/errors';

export function parseInput<T>(schema: z.ZodType<T>, input: unknown): T {
  const result = schema.safeParse(input);
  if (!result.success)
    throw new WorkbenchError('INVALID_INPUT', result.error.issues[0]?.message || '请求参数无效');
  return result.data;
}
