import { createOpenAI } from '@ai-sdk/openai';
import { wrapLanguageModel } from 'ai';
import type { Progress } from '@shared/contracts';

export function createModel(
  baseURL: string,
  apiKey: string,
  modelName: string,
  signal?: AbortSignal,
  progress?: (event: Progress) => void,
  onResponse?: (text: string) => void,
): ReturnType<typeof wrapLanguageModel> {
  const model = createOpenAI({
    baseURL,
    apiKey: apiKey || 'local',
    fetch: async (url, init) => {
      return fetch(url, {
        ...init,
        signal: AbortSignal.any([
          ...(init?.signal ? [init.signal] : []),
          ...(signal ? [signal] : []),
          AbortSignal.timeout(180000),
        ]),
      });
    },
  }).chat(modelName);
  if (!progress && !onResponse) return model;
  let request = 0;
  return wrapLanguageModel({
    model,
    middleware: {
      wrapGenerate: async ({ doGenerate }) => {
        const number = ++request;
        const started = Date.now();
        progress?.({ at: new Date().toISOString(), stage: 'modelstart', label: `第 ${number} 次模型调用` });
        try {
          const result = await doGenerate();
          onResponse?.(
            result.content
              .filter((part) => part.type === 'text')
              .map((part) => part.text)
              .join(''),
          );
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
