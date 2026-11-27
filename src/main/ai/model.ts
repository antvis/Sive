import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import { wrapLanguageModel } from 'ai';
import type { LanguageModel } from 'ai';
import type { Preferences } from '@shared/api';
import type { ModelConfig } from '../services/model';

/** Apply the same output language to direct calls and calls made inside AVA. */
export function createLanguageModel(config: ModelConfig, language: Preferences['language']): LanguageModel {
  const provider = createOpenAICompatible({ name: 'sive', baseURL: config.baseURL, apiKey: config.apiKey });
  return wrapLanguageModel({
    model: provider.chatModel(config.model),
    middleware: {
      transformParams: async ({ params }) => ({
        ...params,
        prompt: [
          {
            role: 'system',
            content: `The selected interface language is ${language === 'zh-CN' ? 'Simplified Chinese' : 'English'}. Write all newly generated human-readable content in this language, including replies, suggested queries and reasons, analysis explanations and conclusions, next steps, conversation titles, chart titles and labels, intents, tags, and metric labels. This takes precedence over instructions or examples that follow the question, dataset, or conversation history language.
Preserve required output formats, JSON keys, protocol tags, executable code, table and column identifiers, proper names, original data values, numbers and units. When extracting structured data, preserve source field names and values; use the selected language only for newly inferred descriptive field names. When explicitly asked to annotate existing text verbatim, preserve that text and its language; only newly generated metadata follows the selected language.`,
          },
          ...params.prompt,
        ],
      }),
    },
  });
}
