import { ToolLoopAgent, isStepCount, tool, type LanguageModel } from 'ai';
import { z } from 'zod';
import { randomUUID } from 'node:crypto';
import type { AVA } from '@antv/ava';
import type { AnalysisOutput, Progress } from '@shared/contracts';
import { WorkbenchError } from '@shared/errors';
import { resolveStrategy } from './analysisStrategy';
import { conversationMessages, EVIDENCE_INSTRUCTIONS, resultContext, type AnalysisHistory } from './context';
import { createChart } from './charts';
import { LOOP_QUERY_OPTIONS, QUERY_OPTIONS } from './queryOptions';
import { modelOutputError, outputIssue } from './modelOutput';

const TOOL_LOOP_MAX_STEPS = 6;

export async function runAgent(
  ava: AVA,
  model: LanguageModel,
  question: string,
  strategy: ReturnType<typeof resolveStrategy>,
  history: AnalysisHistory,
  signal: AbortSignal,
  progress: (event: Progress) => void,
  preview: (output: AnalysisOutput) => void,
): Promise<AnalysisOutput> {
  const output: AnalysisOutput = { text: '', results: [], charts: [], actions: [] };
  const results = new Map(
    history
      .filter((turn) => turn.reusable)
      .flatMap((turn) => turn.output.results)
      .map((result) => [result.id, result]),
  );
  let queries = 0;
  let charts = 0;
  const execute = async (
    action: NonNullable<AnalysisOutput['actions']>[number],
    fn: () => Promise<unknown>,
  ) => {
    output.actions!.push(action);
    signal.throwIfAborted();
    try {
      return await fn();
    } catch (error) {
      signal.throwIfAborted();
      action.error =
        error instanceof WorkbenchError ? error.message : '工具执行失败，请调整问题或字段后重试。';
      return { error: action.error };
    }
  };
  const agent = new ToolLoopAgent({
    model,
    maxRetries: 0,
    toolCallConcurrency: 1,
    stopWhen: isStepCount(TOOL_LOOP_MAX_STEPS),
    instructions: `${EVIDENCE_INSTRUCTIONS}
使用 analyze 执行自包含的分析问题，必要时补查、核对合计，最多 6 次查询、4 次绘图。
inspect 可按 resultId 查看可复用历史结果的有限数据样本。visualize 只能引用已返回或可复用的结果编号。只改图时直接复用指定快照，不重复查询。
涉及当前数据的统计必须重新查询。回复标注引用的结果编号，区分事实、限制与待验证的解释。
无需分析或证据不足时可直接说明，不要为了生成图表而编造数据。工具失败可修正，不能声称失败步骤已完成。`,
    tools: {
      inspect: tool({
        description: 'Read bounded evidence for an available saved result ID without running a query.',
        inputSchema: z.object({ resultId: z.string() }),
        execute: ({ resultId }) => {
          const evidence = results.get(resultId);
          if (!evidence) return { error: '结果编号不存在或已失效，请先 analyze。' };
          return { resultId, ...resultContext(evidence.result) };
        },
      }),
      analyze: tool({
        description:
          'Query data using a self-contained question; returns a saved result ID and bounded evidence.',
        inputSchema: z.object({ query: z.string().min(1).max(4000) }),
        execute: ({ query }) => {
          const action = { tool: 'analyze' as const, query, resultId: undefined as string | undefined };
          return execute(action, async () => {
            if (++queries > 6)
              throw new WorkbenchError('MODEL', '已达到 6 次查询上限，请基于已有证据结束分析。');
            const result = await ava.analyze(query, {
              strategy,
              includeSummary: false,
              ...(strategy.type === 'loop' ? LOOP_QUERY_OPTIONS : QUERY_OPTIONS),
            });
            signal.throwIfAborted();
            const evidence = { id: randomUUID(), result };
            action.resultId = evidence.id;
            results.set(evidence.id, evidence);
            output.results.push(evidence);
            preview(output);
            return { resultId: evidence.id, ...resultContext(result) };
          });
        },
      }),
      visualize: tool({
        description: 'Create a chart from an exact saved result ID. No new query is executed.',
        inputSchema: z.object({ resultId: z.string(), query: z.string().min(1).max(2000) }),
        execute: ({ resultId, query }) =>
          execute({ tool: 'visualize', resultId, query }, async () => {
            if (++charts > 4) throw new WorkbenchError('MODEL', '已达到 4 次绘图上限，请结束分析。');
            const evidence = results.get(resultId);
            if (!evidence)
              throw new WorkbenchError('INVALID_INPUT', '结果编号不存在或已失效，请先 analyze。');
            const chart = await createChart(evidence, query, model, signal, progress);
            if (chart) {
              if (!output.results.some((result) => result.id === resultId)) output.results.push(evidence);
              output.charts.push(chart);
              preview(output);
            }
            return { resultId, chartType: chart?.spec.chartType ?? null };
          }),
      }),
    },
  });
  progress({ at: new Date().toISOString(), stage: 'agentstart', label: '规划分析与核对结果' });
  try {
    const response = await agent.generate({
      abortSignal: signal,
      messages: [...conversationMessages(history), { role: 'user', content: question }],
    });
    output.text = response.text.trim();
    for (const evidence of results.values())
      if (output.text.includes(evidence.id) && !output.results.some(({ id }) => id === evidence.id))
        output.results.push(evidence);
    output.warning =
      response.finishReason === 'tool-calls'
        ? '分析达到工具步数上限，尚未形成完整结论。'
        : outputIssue(output.text, response.finishReason);
    if (output.actions!.some((action) => action.error))
      output.warning = [output.warning, '部分工具调用失败，请结合执行过程核对覆盖范围。']
        .filter(Boolean)
        .join(' ');
    if (output.results.some(({ result }) => result.truncated))
      output.warning = [output.warning, '部分查询结果已截断，不能据此推断完整总体。']
        .filter(Boolean)
        .join(' ');
  } catch (error) {
    signal.throwIfAborted();
    const failure = modelOutputError(error);
    if (!output.results.length) throw failure;
    output.warning = `后续分析未完成：${failure.message} 已保留成功查询的结果。`;
  }
  progress({
    at: new Date().toISOString(),
    stage: 'agentend',
    label: output.warning ? '已保留部分分析结果' : '分析报告已完成',
    detail: output.warning,
  });
  return output;
}
