import type { AnalysisResponse, AnalysisStrategyConfig, QueryColumn } from '@antv/ava';
import type { ModelMessage, ToolResultPart, UIMessage } from 'ai';
import { getMessages } from './i18n';

export type AnalysisTraceStatus = 'running' | 'completed' | 'failed' | 'cancelled';

type AnalysisTraceNode = {
  id: string;
  status: AnalysisTraceStatus;
  atMs: number;
  durationMs?: number;
  error?: string;
  usage?: { inputTokens?: number; outputTokens?: number };
};

export type AnalysisTraceOperation = AnalysisTraceNode & {
  kind: 'translate' | 'query' | 'summarize';
  attempt?: number;
  dsl?: string;
  queryId?: string;
  queryExplanation?: string;
  conclusion?: string;
  limitations?: string;
  nextStep?: string;
  result?: {
    columns: QueryColumn[];
    returnedRows: number;
    truncated?: boolean;
    truncatedBy?: 'maxRows' | 'maxResultBytes';
    preview?: string;
  };
};

export type AnalysisTraceStep = AnalysisTraceNode & {
  kind: 'step';
  index: number;
  parentStepIds: string[];
  finalAttempt?: boolean;
  action?: 'EXPLORE' | 'REFINE' | 'SQL' | 'CONFIRM';
  text?: string;
  operations: AnalysisTraceOperation[];
};

export type AnalysisTrace = {
  toolCallId: string;
  query: string;
  strategy: AnalysisStrategyConfig;
  start: { datasetId: string; datasetName?: string };
  status: AnalysisTraceStatus;
  durationMs?: number;
  error?: string;
  steps: AnalysisTraceStep[];
};

type AnalysisToolResult = {
  result: AnalysisResponse | null;
  trace?: AnalysisTrace;
};

export type AnalysisToolOutput = AnalysisToolResult & { trace: AnalysisTrace };

/**
 * Checks whether the tool output is a non-null object with a `result` field.
 * Failed analyses can have a `null` result, and `trace` is optional.
 */
export function isAnalysisToolResult(output: unknown): output is AnalysisToolResult {
  return typeof output === 'object' && output !== null && 'result' in output;
}

/**
 * Indexes the analysis traces in UI messages by their tool call IDs.
 */
export function getAnalysisTraces(messages: readonly Pick<UIMessage, 'parts'>[]): Map<string, AnalysisTrace> {
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
  return traces;
}

/**
 * Retrieves a completed `analyze` result from the messages sent to the model.
 *
 * @param analysisId - The tool call ID exposed by `analyze` as `analysisId`.
 * @throws {Error} If no matching call has a usable JSON analysis result.
 */
export function requireAnalysisResult(messages: ModelMessage[], analysisId: string): AnalysisResponse {
  const output = messages
    .flatMap((message) => (message.role === 'tool' ? message.content : []))
    .find(
      (part): part is ToolResultPart =>
        part.type === 'tool-result' && part.toolName === 'analyze' && part.toolCallId === analysisId,
    )?.output;

  if (output?.type === 'json' && isAnalysisToolResult(output.value) && output.value.result) {
    return output.value.result;
  }
  throw new Error(getMessages('zh-CN')['errors.analysis.resultUnavailable']);
}
