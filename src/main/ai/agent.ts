import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import { AVA } from '@antv/ava';
import type { DataSourceConfig, Semantic } from '@antv/ava';
import { ToolLoopAgent } from 'ai';
import type { ModelMessage, ToolSet } from 'ai';
import { createTools } from './tools';

type ModelConfig = { baseURL: string; model: string; apiKey?: string };

type CreateAgentInput = {
  sourceConfig: DataSourceConfig;
  semantic: Semantic;
  model: ModelConfig;
  history: ModelMessage[];
};

type GenerateInput = {
  question: string;
  strategy: 'direct' | 'loop';
  abortSignal: AbortSignal;
};

type AnalysisAgent = {
  generate(input: GenerateInput): ReturnType<ToolLoopAgent<never, ToolSet>['generate']>;
};

const INSTRUCTIONS =
  '你是数据分析助手。使用 analyze 获取真实数据结论，必要时使用 visualize 创建图表。根据用户问题直接回答，不要编造数据。';

export async function createAnalysisAgent({
  sourceConfig,
  semantic,
  model,
  history,
}: CreateAgentInput): Promise<AnalysisAgent> {
  const provider = createOpenAICompatible({ name: 'sive', baseURL: model.baseURL, apiKey: model.apiKey });
  const languageModel = provider.chatModel(model.model);
  const ava = new AVA({
    llm: { model: languageModel },
    engine: { type: 'duckdb', memoryLimit: '1024MB' },
  });
  await ava.source(sourceConfig);
  await ava.schema();
  await ava.profile({ metrics: ['row_count'] });
  await ava.semantic({}, () => semantic);

  const messages = [...history];
  const options = { maxSteps: 3 };
  const agent = new ToolLoopAgent({
    model: languageModel,
    instructions: INSTRUCTIONS,
    tools: createTools(ava),
    stopWhen: ({ steps }) => steps.length >= options.maxSteps,
  });

  return {
    async generate({ question, strategy, abortSignal }) {
      messages.push({ role: 'user', content: question });
      options.maxSteps = strategy === 'loop' ? 8 : 3;
      const result = await agent.generate({ messages, abortSignal });
      messages.push(...result.responseMessages);
      return result;
    },
  };
}
