import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import { wrapLanguageModel } from 'ai';
import type { Progress } from '@shared/contracts';
import { WorkbenchError } from '@shared/errors';

export function createModel(
  baseURL: string,
  apiKey: string,
  modelName: string,
  signal?: AbortSignal,
  progress?: (event: Progress) => void,
): ReturnType<typeof wrapLanguageModel> {
  const modelFetch: typeof fetch = async (url, init) =>
    fetch(url, {
      ...init,
      signal: AbortSignal.any([
        ...(init?.signal ? [init.signal] : []),
        ...(signal ? [signal] : []),
        AbortSignal.timeout(180000),
      ]),
    });
  const model = createOpenAICompatible({
    name: 'sive',
    baseURL,
    apiKey,
    fetch: modelFetch,
  }).chatModel(modelName);
  let request = 0;
  return wrapLanguageModel({
    model,
    middleware: {
      wrapGenerate: async ({ doGenerate, params }) => {
        const number = ++request;
        signal?.throwIfAborted();
        if (number > 24) throw new WorkbenchError('MODEL', '已达到本次分析的模型调用上限，请缩小问题范围。');
        if (Buffer.byteLength(JSON.stringify(params.prompt)) > 256 * 1024)
          throw new WorkbenchError('MODEL', '分析上下文过大，请缩小问题范围或开始新会话。');
        const started = Date.now();
        progress?.({ at: new Date().toISOString(), stage: 'modelstart', label: `第 ${number} 次模型调用` });
        try {
          const result = await doGenerate();
          const characters = result.content.reduce(
            (count, part) => count + (part.type === 'text' ? Array.from(part.text).length : 0),
            0,
          );
          progress?.({
            at: new Date().toISOString(),
            stage: 'modelend',
            label: `第 ${number} 次模型调用已返回`,
            detail: `收到 ${characters} 个字符的响应`,
            durationMs: Date.now() - started,
            inputTokens: result.usage.inputTokens.total,
            outputTokens: result.usage.outputTokens.total,
            reasoningTokens: result.usage.outputTokens.reasoning,
            finishReason: result.finishReason.unified,
          });
          return result;
        } catch (error) {
          progress?.({
            at: new Date().toISOString(),
            stage: 'modelend',
            label: signal?.aborted ? '模型调用已取消' : '模型调用未完成',
            error: !signal?.aborted,
            durationMs: Date.now() - started,
          });
          throw error;
        }
      },
    },
  });
}
