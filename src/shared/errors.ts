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
export function failure(error: unknown): Reply<never> {
  return {
    ok: false,
    error:
      error instanceof WorkbenchError
        ? { code: error.code, message: error.message }
        : { code: 'INTERNAL', message: '操作未完成，请检查数据和服务状态后重试。' },
  };
}
export function unwrap<T>(reply: Reply<T>): T {
  if (!reply.ok) throw new WorkbenchError(reply.error.code, reply.error.message);
  return reply.value;
}
