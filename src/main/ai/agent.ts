import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import { AVA } from '@antv/ava';
import { ToolLoopAgent, createAgentUIStream, generateId, isStepCount } from 'ai';
import type { InferUIMessageChunk, UIMessageStreamOnEndCallback } from 'ai';
import { isAnalysisToolResult } from '@shared/analysis-trace';
import type { AnalysisTrace } from '@shared/analysis-trace';
import { DEFAULT_PREFERENCES } from '@shared/api';
import type { ChatMessage, DuckDBEngineConfig } from '@shared/api';
import type { ModelConfig } from '../services/model';
import { errorText } from '../util';
import { sourceEngine } from '../util/engine';
import { createTools } from './tools';
import type { ToolContext, ToolOptions } from './tools';

type CreateAgentInput = {
  context: ToolContext;
  model: ModelConfig;
  engine: DuckDBEngineConfig;
};

type StreamInput = {
  messages: ChatMessage[];
  createdAt: string;
  toolOptions: ToolOptions;
  agent: { maxSteps: number };
  abortSignal: AbortSignal;
  onEnd: UIMessageStreamOnEndCallback<ChatMessage>;
};

type AnalysisChunk = InferUIMessageChunk<ChatMessage>;
type AgentCallOptions = Pick<StreamInput, 'messages' | 'toolOptions' | 'agent'>;

export type AnalysisAgent = {
  stream(input: StreamInput): Promise<ReadableStream<AnalysisChunk>>;
  dispose(): Promise<void>;
};

const INSTRUCTIONS =
  '你是数据分析助手。首次提问时必须依次调用 source、schema、profile、semantic 完成数据准备，后续轮次不要重复初始化。准备完成后使用 analyze 获取真实数据结论。图表有助于回答问题时，从已完成的分析中选择相关结果，将其 analysisId 传给 visualize。根据用户问题直接回答，不要编造数据。';

export async function createAnalysisAgent({
  context,
  model,
  engine,
}: CreateAgentInput): Promise<AnalysisAgent> {
  const provider = createOpenAICompatible({ name: 'sive', baseURL: model.baseURL, apiKey: model.apiKey });
  const languageModel = provider.chatModel(model.model);
  const ava = new AVA({
    llm: { model: languageModel },
    engine: sourceEngine(context.dataset.sourceConfig, engine),
  });

  const tools = createTools(ava, context, languageModel);

  const agent = new ToolLoopAgent<AgentCallOptions, typeof tools>({
    model: languageModel,
    tools,
    toolsContext: {
      analyze: { strategy: DEFAULT_PREFERENCES.strategy },
      visualize: { traces: new Map() },
    },
    toolCallConcurrency: 1,
    prepareCall({
      options: {
        messages,
        toolOptions,
        agent: { maxSteps },
      },
      ...call
    }) {
      const traces = new Map<string, AnalysisTrace>();
      for (const { parts } of messages) {
        for (const part of parts) {
          if (
            part.type === 'tool-analyze' &&
            part.state === 'output-available' &&
            isAnalysisToolResult(part.output) &&
            part.output.trace
          ) {
            traces.set(part.toolCallId, part.output.trace);
          }
        }
      }

      return {
        ...call,
        instructions: `${INSTRUCTIONS}\n本轮开始时，分析引擎${ava.engine ? '已载入数据，可以继续使用' : '尚未载入数据，请先完成数据准备'}。`,
        stopWhen: isStepCount(maxSteps),
        toolsContext: {
          analyze: toolOptions,
          visualize: { traces },
        },
        prepareStep({ steps }) {
          for (const { toolName, toolCallId, output } of steps.at(-1)?.staticToolResults ?? []) {
            if (toolName === 'analyze' && isAnalysisToolResult(output) && output.trace) {
              traces.set(toolCallId, output.trace);
            }
          }
          return undefined;
        },
      };
    },
  });

  return {
    dispose: () => ava.dispose(),

    stream({ messages, createdAt, toolOptions, agent: agentConfig, abortSignal, onEnd }) {
      return createAgentUIStream<
        AgentCallOptions,
        typeof tools,
        Record<string, unknown>,
        never,
        NonNullable<ChatMessage['metadata']>
      >({
        agent,
        uiMessages: messages,
        options: { messages, toolOptions, agent: agentConfig },
        abortSignal,
        generateMessageId: generateId,
        messageMetadata: ({ part }) => (part.type === 'start' ? { createdAt } : undefined),
        sendReasoning: false,
        onError: errorText,
        onEnd,
      });
    },
  };
}
