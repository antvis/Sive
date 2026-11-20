import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import { AVA } from '@antv/ava';
import { ToolLoopAgent, createAgentUIStream, generateId, isStepCount, isTextUIPart } from 'ai';
import type { AnalysisStrategyConfig } from '@antv/ava';
import type { UIMessage, UIMessageStreamOnEndCallback } from 'ai';
import type { DuckDBEngineConfig } from '@shared/api';
import { sourceEngine } from '../util/engine';
import { createTools } from './tools';
import type { ToolContext } from './tools';
import type { ModelConfig } from '../services/model';

type CreateAgentInput = {
  dataset: ToolContext;
  model: ModelConfig;
  engine: DuckDBEngineConfig;
};

type StreamInput = {
  messages: UIMessage[];
  createdAt: string;
  strategy: AnalysisStrategyConfig;
  agent: { maxSteps: number };
  abortSignal: AbortSignal;
  onEnd: UIMessageStreamOnEndCallback<UIMessage>;
};

export type AnalysisAgent = {
  stream(input: StreamInput): ReturnType<typeof createAgentUIStream>;
  dispose(): Promise<void>;
};

const INSTRUCTIONS =
  '你是数据分析助手。首次提问时必须依次调用 source、schema、profile、semantic 完成数据准备，后续轮次不要重复初始化。准备完成后使用 analyze 获取真实数据结论，必要时使用 visualize 创建图表。根据用户问题直接回答，不要编造数据。';

export async function createAnalysisAgent({
  dataset,
  model,
  engine,
}: CreateAgentInput): Promise<AnalysisAgent> {
  const provider = createOpenAICompatible({ name: 'sive', baseURL: model.baseURL, apiKey: model.apiKey });
  const languageModel = provider.chatModel(model.model);
  const ava = new AVA({
    llm: { model: languageModel },
    engine: sourceEngine(dataset.sourceConfig, engine),
  });
  const options = {
    agent: { maxSteps: 10 },
    strategy: { type: 'direct' } as AnalysisStrategyConfig,
    question: '',
  };

  const agent = new ToolLoopAgent({
    model: languageModel,
    instructions: INSTRUCTIONS,
    tools: createTools(ava, dataset, () => options, languageModel),
    stopWhen: (context) => isStepCount(options.agent.maxSteps)(context),
  });

  return {
    dispose: () => ava.dispose(),

    stream({ messages, createdAt, strategy, agent: agentConfig, abortSignal, onEnd }) {
      options.strategy = strategy;
      options.agent = agentConfig;
      options.question =
        messages
          .at(-1)
          ?.parts.filter(isTextUIPart)
          .map((part) => part.text)
          .join('')
          .trim() ?? '';
      return createAgentUIStream({
        agent,
        uiMessages: messages,
        abortSignal,
        generateMessageId: generateId,
        messageMetadata: ({ part }) => (part.type === 'start' ? { createdAt } : undefined),
        sendReasoning: false,
        onError: (error) => (error instanceof Error ? error.message : String(error)),
        onEnd,
      });
    },
  };
}
