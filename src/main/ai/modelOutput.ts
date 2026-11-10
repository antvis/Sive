import { APICallError, JSONParseError, NoObjectGeneratedError } from 'ai';
import { z } from 'zod';
import { WorkbenchError } from '@shared/errors';

export function outputIssue(text: string, finishReason: string): string | undefined {
  if (finishReason === 'length') return '模型达到输出上限，回答未完成。';
  if (finishReason === 'content-filter') return '模型服务拦截了本次输出。';
  if (!text.trim()) return '模型未返回有效内容。';
  if (finishReason !== 'stop') return `模型未正常结束输出（${finishReason}）。`;
}

// Keep diagnostic types and schema paths, never provider bodies or raw model output.
export function modelOutputError(error: unknown): WorkbenchError {
  if (error instanceof WorkbenchError) return error;
  if (NoObjectGeneratedError.isInstance(error)) {
    const issue = outputIssue(error.text || '', error.finishReason || 'unknown');
    if (issue) return new WorkbenchError('MODEL', issue);
    for (let cause = error.cause; cause instanceof Error; cause = cause.cause) {
      if (JSONParseError.isInstance(cause))
        return new WorkbenchError('MODEL', '模型输出不是有效 JSON（JSONParseError）。');
      if (cause instanceof z.ZodError) {
        const paths = cause.issues
          .slice(0, 3)
          .map((item) => `${item.path.map(String).join('.').slice(0, 100) || '配置'} (${item.code})`);
        return new WorkbenchError('MODEL', `图表配置校验失败（ZodError）：${paths.join('、')}`);
      }
    }
    return new WorkbenchError('MODEL', '图表配置未通过结构校验（NoObjectGeneratedError）。');
  }
  if (APICallError.isInstance(error))
    return new WorkbenchError(
      'MODEL',
      `模型请求失败（HTTP ${error.statusCode ?? '未知'}），请检查服务配置或稍后重试。`,
    );
  if (error instanceof Error && error.name === 'TimeoutError')
    return new WorkbenchError('MODEL', '模型请求超时，请缩小问题范围或稍后重试。');
  return new WorkbenchError('MODEL', '模型生成未完成，请检查服务连接或切换模型。');
}
