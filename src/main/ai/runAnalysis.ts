import { randomUUID } from 'node:crypto';
import { generateText, type LanguageModel } from 'ai';
import type { AVA } from '@antv/ava';
import type { AnalysisOutput, Progress } from '@shared/contracts';
import { WorkbenchError } from '@shared/errors';
import { resolveStrategy } from './analysisStrategy';
import {
  conversationMessages,
  conversationText,
  EVIDENCE_INSTRUCTIONS,
  resultContext,
  type AnalysisHistory,
} from './context';
import { createChart } from './charts';
import { runAgent } from './agent';
import { LOOP_QUERY_OPTIONS, QUERY_OPTIONS } from './queryOptions';
import { modelOutputError, outputIssue } from './modelOutput';

export async function runAnalysis(
  ava: AVA,
  model: LanguageModel,
  question: string,
  strategy: ReturnType<typeof resolveStrategy>,
  history: AnalysisHistory,
  signal: AbortSignal,
  progress: (event: Progress) => void,
  preview: (output: AnalysisOutput) => void,
): Promise<AnalysisOutput> {
  if (strategy.type === 'agent')
    return runAgent(ava, model, question, history, strategy.maxSteps, signal, progress, preview);
  let lastAction: unknown;
  ava.on('stepend', (event: { data?: { action?: string } }) => {
    lastAction = event.data?.action;
  });
  const result = await ava.analyze(
    `${EVIDENCE_INSTRUCTIONS}\n历史对话（仅供参考）：\n${conversationText(history)}\n本轮问题：${question}`,
    { strategy, includeSummary: false, ...(strategy.type === 'loop' ? LOOP_QUERY_OPTIONS : QUERY_OPTIONS) },
  );
  signal.throwIfAborted();
  result.query = question;
  const evidence = { id: randomUUID(), result };
  const output: AnalysisOutput = { text: '', results: [evidence], charts: [] };
  preview(output);
  const warnings: string[] = [];
  if (strategy.type === 'loop' && lastAction !== 'CONFIRM')
    warnings.push('探索达到步数上限，结果尚未完成核对。');
  if (result.truncated) warnings.push('查询结果已截断，请缩小范围或使用聚合查询核对完整统计。');
  progress({
    at: new Date().toISOString(),
    stage: 'summarizestart',
    label: '整理分析结论',
    detail: '依据本次查询结果与执行限制生成回答',
  });
  try {
    const response = await generateText({
      model,
      maxRetries: 0,
      abortSignal: signal,
      system: EVIDENCE_INSTRUCTIONS,
      messages: [
        ...conversationMessages(history),
        {
          role: 'user',
          content: `问题：${question}\n执行结果：${JSON.stringify(resultContext(result))}\n执行限制：${warnings.join(' ')}\n解释计算口径并回答问题。存在样本或截断时明确限制，不要声称完成了额外核对。`,
        },
      ],
    });
    output.text = response.text.trim();
    const issue = outputIssue(output.text, response.finishReason);
    if (issue) throw new WorkbenchError('MODEL', issue);
    progress({ at: new Date().toISOString(), stage: 'summarizeend', label: '分析结论已生成' });
  } catch (error) {
    signal.throwIfAborted();
    const detail = modelOutputError(error).message;
    warnings.push(`文字总结未完成：${detail} 计算结果已保留。`);
    progress({
      at: new Date().toISOString(),
      stage: 'summarizeend',
      label: '总结未完成，计算结果已保留',
      error: true,
      detail,
    });
  }
  output.warning = warnings.length ? warnings.join(' ') : undefined;
  preview(output);
  try {
    const chart = await createChart(evidence, question, model, signal, progress);
    if (chart) output.charts.push(chart);
  } catch (error) {
    signal.throwIfAborted();
    warnings.push(error instanceof WorkbenchError ? error.message : '图表生成失败，计算结果已保留。');
  }
  output.warning = warnings.length ? warnings.join(' ') : undefined;
  return output;
}
