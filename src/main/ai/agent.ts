import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import { AVA } from '@antv/ava';
import { ToolLoopAgent } from 'ai';
import type { ModelMessage, TextStreamPart, ToolSet } from 'ai';
import { createTools } from './tools';
import type { ToolContext } from './tools';

type ModelConfig = { baseURL: string; model: string; apiKey?: string };

type CreateAgentInput = {
  dataset: ToolContext;
  model: ModelConfig;
  history: ModelMessage[];
};

type StreamInput = {
  question: string;
  strategy: 'direct' | 'loop';
  abortSignal: AbortSignal;
  onPart: (part: TextStreamPart<ToolSet>) => void;
};

type AnalysisAgent = {
  stream(input: StreamInput): ReturnType<ToolLoopAgent<never, ToolSet>['stream']>;
};

const INSTRUCTIONS =
  '你是数据分析助手。首次提问时必须依次调用 source、schema、profile、semantic 完成数据准备，后续轮次不要重复初始化。准备完成后使用 analyze 获取真实数据结论，必要时使用 visualize 创建图表。根据用户问题直接回答，不要编造数据。';

export async function createAnalysisAgent({
  dataset,
  model,
  history,
}: CreateAgentInput): Promise<AnalysisAgent> {
  const provider = createOpenAICompatible({ name: 'sive', baseURL: model.baseURL, apiKey: model.apiKey });
  const languageModel = provider.chatModel(model.model);
  const ava = new AVA({
    llm: { model: languageModel },
    engine: { type: 'duckdb', memoryLimit: '1024MB' },
  });
  const messages = [...history];
  const options = { maxSteps: 7 };
  const agent = new ToolLoopAgent({
    model: languageModel,
    instructions: INSTRUCTIONS,
    tools: createTools(ava, dataset),
    stopWhen: ({ steps }) => steps.length >= options.maxSteps,
  });
  return {
    async stream({ question, strategy, abortSignal, onPart }) {
      messages.push({ role: 'user', content: question });
      options.maxSteps = strategy === 'loop' ? 12 : 7;
      const result = await agent.stream({ messages, abortSignal });
      for await (const part of result.stream) {
        if (['text-delta', 'tool-call', 'tool-result', 'tool-error'].includes(part.type)) onPart(part);
      }
      messages.push(...(await result.responseMessages));
      return result;
    },
  };
}
