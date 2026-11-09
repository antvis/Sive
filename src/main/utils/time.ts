// Keep modification times distinct for cache invalidation and asynchronous writes.
export const timestamp = (previous?: string) =>
  new Date(Math.max(Date.now(), previous ? Date.parse(previous) + 1 : 0)).toISOString();
