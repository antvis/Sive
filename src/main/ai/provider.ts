import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import type { LanguageModel } from 'ai';

export function createModel(
  baseURL: string,
  apiKey: string,
  modelName: string,
  signal?: AbortSignal,
): Exclude<LanguageModel, string> {
  const modelFetch: typeof fetch = async (url, init) =>
    fetch(url, {
      ...init,
      signal: AbortSignal.any([
        ...(init?.signal ? [init.signal] : []),
        ...(signal ? [signal] : []),
        AbortSignal.timeout(180000),
      ]),
    });
  return createOpenAICompatible({
    name: 'sive',
    baseURL,
    apiKey,
    fetch: modelFetch,
  }).chatModel(modelName);
}
