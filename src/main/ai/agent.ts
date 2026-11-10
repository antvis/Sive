import {
  ToolLoopAgent,
  isStaticToolUIPart,
  readUIMessageStream,
  toUIMessageStream,
  tool,
  type LanguageModel,
  type UIMessage,
} from 'ai';
import { z } from 'zod';
import { randomUUID } from 'node:crypto';
import type { AVA } from '@antv/ava';
import type { AnalysisOutput, AnalysisTools, AnalysisMode, AnalysisOptions } from '@shared/contracts';
import { WorkbenchError } from '@shared/errors';
import { conversationMessages, EVIDENCE_INSTRUCTIONS, resultContext, type AnalysisHistory } from './context';
import { createChart } from './charts';
import { loadSource, sourceSchema } from '../ava/sources';
import { businessSemantic } from './semantics';
import type { StoredDataset } from '../db/types';
import type { ConnectionService } from '../services/data/ConnectionService';

export function resolveStrategy(mode: AnalysisMode, options: AnalysisOptions = {}) {
  const value = mode === 'direct' ? (options.maxRetries ?? 2) : (options.maxSteps ?? 6);
  const min = mode === 'direct' ? 0 : 3;
  const max = mode === 'direct' ? 5 : 12;
  if (!Number.isInteger(value) || value < min || value > max)
    throw new WorkbenchError(
      'INVALID_INPUT',
      mode === 'direct' ? '查询纠错次数需为 0–5 的整数' : '探索步数需为 3–12 的整数',
    );
  return mode === 'direct'
    ? { type: 'direct' as const, maxRetries: value }
    : { type: 'loop' as const, maxSteps: value };
}

export async function runAgent(
  ava: AVA,
  model: Exclude<LanguageModel, string>,
  question: string,
  strategy: ReturnType<typeof resolveStrategy>,
  history: AnalysisHistory,
  signal: AbortSignal,
  preview: (output: AnalysisOutput) => void,
  source: { dataset: StoredDataset; connections: ConnectionService },
): Promise<AnalysisOutput> {
  const { dataset, connections } = source;
  const output: AnalysisOutput = { text: '', results: [], charts: [], tools: [] };
  const prerequisites: ('source' | 'schema' | 'profile' | 'semantic')[] = ['source', 'schema', 'profile'];
  if (dataset.semantic || dataset.metrics?.length) prerequisites.push('semantic');
  const results = new Map(
    history
      .filter((turn) => turn.reusable)
      .flatMap((turn) => turn.output.results)
      .map((result) => [result.id, result]),
  );

  const getEvidence = (resultId: string) => {
    const evidence = results.get(resultId);
    if (!evidence) throw new WorkbenchError('INVALID_INPUT', '结果编号不存在或已失效，请先 analyze。');
    return evidence;
  };

  const evidenceModelOutput = ({
    output: { resultId },
  }: {
    output: { resultId: string };
  }): { type: 'text'; value: string } => ({
    type: 'text',
    value: JSON.stringify({ resultId, ...resultContext(getEvidence(resultId).result) }),
  });

  const agent = new ToolLoopAgent({
    model,
    maxRetries: 0,
    toolCallConcurrency: 1,
    // Override the SDK's default step limit; task cancellation and timeout still apply.
    stopWhen: () => false,
    onError: () => {
      // Errors are propagated through the UI stream below.
    },
    instructions: `${EVIDENCE_INSTRUCTIONS}
先依次执行 source、schema、profile；存在业务定义时读取 semantic，再根据实际字段和统计信息分析。
profile 返回导入或刷新数据源时保存的统计快照；当前数据的统计仍需通过 analyze 查询。
使用 analyze 执行自包含的分析问题，必要时补查、核对合计。
inspect 可按 resultId 查看可复用历史结果的有限数据样本。visualize 只能引用已返回或可复用的结果编号。只改图时直接复用指定快照，不重复查询。
涉及当前数据的统计必须重新查询。回复标注引用的结果编号，区分事实、限制与待验证的解释。
无需分析或证据不足时可直接说明，不要为了生成图表而编造数据。工具失败可修正，不能声称失败步骤已完成。`,
    tools: {
      source: tool({
        description: 'Load the selected dataset into the analysis engine.',
        inputSchema: z.object({}),
        execute: async () => {
          signal.throwIfAborted();
          await loadSource(ava, dataset, connections);
          return { name: dataset.name, format: dataset.format };
        },
      }),
      schema: tool({
        description: 'Read the loaded tables, field types and relationships.',
        inputSchema: z.object({}),
        execute: async () => {
          signal.throwIfAborted();
          const schema = await sourceSchema(ava, dataset);
          return schema ? ava.schema({}, () => schema) : ava.schema();
        },
      }),
      profile: tool({
        description: 'Read the saved data statistics snapshot, including missing values and distributions.',
        inputSchema: z.object({}),
        execute: () => {
          signal.throwIfAborted();
          return ava.profile({}, () => dataset.profile);
        },
      }),
      semantic: tool({
        description: 'Read the user-defined business metrics and field meanings.',
        inputSchema: z.object({}),
        execute: () => {
          signal.throwIfAborted();
          return ava.semantic({}, () => businessSemantic(dataset.semantic, dataset.metrics));
        },
      }),
      inspect: tool({
        description: 'Read bounded evidence for an available saved result ID without running a query.',
        inputSchema: z.object({ resultId: z.string() }),
        execute: ({ resultId }) => {
          signal.throwIfAborted();
          getEvidence(resultId);
          return { resultId };
        },
        toModelOutput: evidenceModelOutput,
      }),
      analyze: tool({
        description:
          'Query data using a self-contained question; returns a saved result ID and bounded evidence.',
        inputSchema: z.object({ query: z.string().min(1).max(4000) }),
        execute: async ({ query }) => {
          signal.throwIfAborted();
          const result = await ava.analyze(query, {
            strategy,
            includeSummary: false,
          });
          signal.throwIfAborted();
          const evidence = { id: randomUUID(), result };
          results.set(evidence.id, evidence);
          output.results.push(evidence);
          return { resultId: evidence.id };
        },
        toModelOutput: evidenceModelOutput,
      }),
      visualize: tool({
        description: 'Create a chart from an exact saved result ID. No new query is executed.',
        inputSchema: z.object({ resultId: z.string(), query: z.string().min(1).max(2000) }),
        execute: async ({ resultId, query }) => {
          signal.throwIfAborted();
          const evidence = getEvidence(resultId);
          const chart = await createChart(evidence, query, model, signal);
          if (chart) {
            if (!output.results.some((result) => result.id === resultId)) output.results.push(evidence);
            output.charts.push(chart);
          }
          return { resultId, chartType: chart?.spec.chartType ?? null };
        },
      }),
    },
    prepareStep: ({ steps }) => {
      const failed = steps.some((step) =>
        step.content.some(
          (part) => part.type === 'tool-error' && prerequisites.some((name) => name === part.toolName),
        ),
      );
      if (failed) return { toolChoice: 'none' };
      const required = prerequisites.find(
        (name) => !steps.some((step) => step.toolResults.some((result) => result.toolName === name)),
      );
      return required
        ? { activeTools: [required], toolChoice: { type: 'tool', toolName: required } }
        : { activeTools: ['inspect', 'analyze', 'visualize'] };
    },
  });

  preview(output);
  try {
    const response = await agent.stream({
      abortSignal: signal,
      messages: [...conversationMessages(history), { role: 'user', content: question }],
    });
    const stream = toUIMessageStream({
      stream: response.stream,
      sendReasoning: false,
      onError: (error) => (error instanceof Error ? error.message : String(error)),
    });

    for await (const message of readUIMessageStream<UIMessage<unknown, never, AnalysisTools>>({
      stream,
      terminateOnError: true,
    })) {
      signal.throwIfAborted();
      output.text = message.parts
        .filter((part) => part.type === 'text')
        .map((part) => part.text)
        .join('');
      output.tools = message.parts.filter(isStaticToolUIPart);
      preview(output);
    }
    signal.throwIfAborted();
    output.text = (await response.text).trim();
    const finishReason = await response.finishReason;

    for (const evidence of results.values())
      if (output.text.includes(evidence.id) && !output.results.some(({ id }) => id === evidence.id))
        output.results.push(evidence);
    output.warning = finishReason !== 'stop' || !output.text ? '模型输出未完成，请重试。' : undefined;
    if ((await response.steps).some((step) => step.content.some((part) => part.type === 'tool-error')))
      output.warning = [output.warning, '部分工具调用失败，请结合执行过程核对覆盖范围。']
        .filter(Boolean)
        .join(' ');
    if (output.results.some(({ result }) => result.truncated))
      output.warning = [output.warning, '部分查询结果已截断，不能据此推断完整总体。']
        .filter(Boolean)
        .join(' ');
  } catch (error) {
    signal.throwIfAborted();
    if (!output.results.length) throw error;
    output.warning = `后续分析未完成：${error instanceof Error ? error.message : String(error)} 已保留成功查询的结果。`;
  }
  return output;
}
