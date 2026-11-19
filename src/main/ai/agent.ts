import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import { AVA } from '@antv/ava';
import { ToolLoopAgent } from 'ai';
import type { AnalysisStrategyConfig } from '@antv/ava';
import type { ModelMessage, TextStreamPart, ToolSet } from 'ai';
import type { DuckDBEngineConfig } from '@shared/api';
import { sourceEngine } from '../util/engine';
import { createTools } from './tools';
import type { ToolContext } from './tools';
import type { ModelConfig } from '../services/model';

type CreateAgentInput = {
  dataset: ToolContext;
  model: ModelConfig;
  history: ModelMessage[];
  engine: DuckDBEngineConfig;
};

type StreamInput = {
  question: string;
  strategy: AnalysisStrategyConfig;
  agent: { maxSteps: number };
  abortSignal: AbortSignal;
  onPart: (part: TextStreamPart<ToolSet>) => void;
};

export type AnalysisAgent = {
  stream(input: StreamInput): ReturnType<ToolLoopAgent<never, ToolSet>['stream']>;
  dispose(): Promise<void>;
};

const INSTRUCTIONS =
  '你是数据分析助手。首次提问时必须依次调用 source、schema、profile、semantic 完成数据准备，后续轮次不要重复初始化。准备完成后使用 analyze 获取真实数据结论，必要时使用 visualize 创建图表。根据用户问题直接回答，不要编造数据。';

export async function createAnalysisAgent({
  dataset,
  model,
  history,
  engine,
}: CreateAgentInput): Promise<AnalysisAgent> {
  const provider = createOpenAICompatible({ name: 'sive', baseURL: model.baseURL, apiKey: model.apiKey });
  const languageModel = provider.chatModel(model.model);
  const ava = new AVA({
    llm: { model: languageModel },
    engine: sourceEngine(dataset.sourceConfig, engine),
  });
  const messages = [...history];
  // This is the default options, but they can be overridden by the `stream` method.
  // The `strategy` option is passed to the tools, and the `agent` option is used to control the agent's behavior.
  // The `maxSteps` option controls how many steps the agent can take before stopping.
  // Tools read the current question and strategy through the options callback.
  const options = {
    agent: { maxSteps: 10 },
    strategy: { type: 'direct' } as AnalysisStrategyConfig,
    question: '',
  };

  const agent = new ToolLoopAgent({
    model: languageModel,
    instructions: INSTRUCTIONS,
    tools: createTools(ava, dataset, () => options, languageModel),
    stopWhen: ({ steps }) => steps.length >= options.agent.maxSteps,
  });

  return {
    dispose: () => ava.dispose(),

    async stream({ question, strategy, agent: agentConfig, abortSignal, onPart }) {
      messages.push({ role: 'user', content: question });

      options.strategy = strategy;
      options.agent = agentConfig;
      options.question = question;

      const result = await agent.stream({ messages, abortSignal });
      for await (const part of result.stream) {
        if (['text-delta', 'tool-call', 'tool-result', 'tool-error'].includes(part.type)) onPart(part);
      }
      messages.push(...(await result.responseMessages));
      return result;
    },
  };
}
