import type { AnalysisResponse, AnalysisStrategyConfig, QueryColumn } from '@antv/ava';

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
  start: { datasetId: string };
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

export function isAnalysisToolResult(output: unknown): output is AnalysisToolResult {
  return typeof output === 'object' && output !== null && 'result' in output;
}
