import { WorkbenchError } from '@shared/errors';
export const conflict = (message: string): never => {
  throw new WorkbenchError('CONFLICT', message);
};
// Keep modification times distinct for cache invalidation and asynchronous writes.
export const timestamp = (previous?: string) =>
  new Date(Math.max(Date.now(), previous ? Date.parse(previous) + 1 : 0)).toISOString();
