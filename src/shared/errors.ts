export type ErrorCode =
  'INVALID_INPUT' | 'CONFLICT' | 'PERSISTENCE' | 'CONNECTION' | 'MODEL' | 'CREDENTIALS' | 'INTERNAL';
export class WorkbenchError extends Error {
  constructor(
    public readonly code: ErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'WorkbenchError';
  }
}
export type Reply<T> = { ok: true; value: T } | { ok: false; error: { code: ErrorCode; message: string } };
