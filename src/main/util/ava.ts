import { AsyncLocalStorage } from 'node:async_hooks';
import type { AnalysisStrategyConfig, AVA, ExecutionResult } from '@antv/ava';
import type { AnalysisTrace, AnalysisTraceOperation, AnalysisTraceStep } from '@shared/analysis-trace';
import { errorText } from './error';

// -----------------------------------------------------------------------------
// Analysis trace collection
// -----------------------------------------------------------------------------

const eventNames = [
  'stepstart',
  'stepend',
  'translatestart',
  'translateend',
  'querystart',
  'queryend',
  'summarizestart',
  'summarizeend',
] as const;

type AvaAnalysisEvent = {
  type: (typeof eventNames)[number];
  context?: { eventId?: string; stepId?: string; parentStepIds?: string[] };
  data?: Partial<ExecutionResult> & {
    step?: number;
    finalAttempt?: boolean;
    action?: AnalysisTraceStep['action'];
    text?: string;
    attempt?: number;
    dsl?: string;
    queryId?: string;
    queryExplanation?: string;
    conclusion?: string;
    limitations?: string;
    nextStep?: string;
    error?: { message: string };
    usage?: AnalysisTraceOperation['usage'];
  };
};

type Capture = {
  trace: AnalysisTrace;
  startedAt: number;
  nodes: Map<string, AnalysisTraceStep | AnalysisTraceOperation>;
};

const activeCapture = new AsyncLocalStorage<Capture>();

function finishTrace(capture: Capture, status: 'completed' | 'failed', error?: unknown) {
  const { trace, startedAt, nodes } = capture;
  trace.status = status;
  trace.durationMs = Math.round(performance.now() - startedAt);
  if (error !== undefined) trace.error = errorText(error);
  for (const node of nodes.values()) {
    if (node.status !== 'running') continue;
    node.status = status;
    node.durationMs = trace.durationMs - node.atMs;
  }
}

function pairId(eventId: string) {
  return eventId.replace(/:(start|end)$/, '');
}

function resultPreview(rows: unknown[]) {
  try {
    const preview = JSON.stringify(rows.slice(0, 3), null, 2);
    return preview.length > 2000 ? `${preview.slice(0, 2000)}…` : preview;
  } catch {
    // Some engines can return values that JSON cannot represent.
    return undefined;
  }
}

/**
 * Captures AVA events for one analysis tool call, with concurrent calls isolated by async context.
 * Run the analysis through `run`, then use `toJSON` to read the trace for persistence.
 */
export function createAnalysisTraceCollector(
  ava: AVA,
  {
    datasetId,
    datasetName,
    query,
    strategy,
    toolCallId,
  }: {
    datasetId: string;
    datasetName: string;
    query: string;
    strategy: AnalysisStrategyConfig;
    toolCallId: string;
  },
) {
  const capture: Capture = {
    trace: {
      toolCallId,
      query,
      strategy,
      start: { datasetId, datasetName },
      status: 'running',
      steps: [],
    },
    startedAt: performance.now(),
    nodes: new Map(),
  };

  const record = ({ type, context, data }: AvaAnalysisEvent) => {
    if (activeCapture.getStore() !== capture || !context?.eventId || !context.stepId) return;
    const { trace, nodes } = capture;
    const id = pairId(context.eventId);
    const atMs = Math.round(performance.now() - capture.startedAt);
    const info = data ?? {};

    if (type === 'stepstart') {
      const step: AnalysisTraceStep = {
        id,
        kind: 'step',
        status: 'running',
        atMs,
        index: info.step ?? trace.steps.length,
        parentStepIds: [...(context.parentStepIds ?? [])],
        finalAttempt: info.finalAttempt,
        operations: [],
      };
      trace.steps.push(step);
      nodes.set(id, step);
      return;
    }

    if (type === 'translatestart' || type === 'querystart' || type === 'summarizestart') {
      const step = nodes.get(context.stepId);
      if (step?.kind !== 'step') return;
      const kind = { translatestart: 'translate', querystart: 'query', summarizestart: 'summarize' } as const;
      const node: AnalysisTraceOperation = {
        id,
        kind: kind[type],
        status: 'running',
        atMs,
        attempt: info.attempt ?? (type === 'querystart' ? step.operations.at(-1)?.attempt : undefined),
        dsl: info.dsl,
        queryId: info.queryId && pairId(info.queryId),
      };
      step.operations.push(node);
      nodes.set(id, node);
      return;
    }

    const node = nodes.get(id);
    if (!node) return;
    node.durationMs = atMs - node.atMs;
    node.status = info.error ? 'failed' : 'completed';
    node.error = info.error?.message;
    if (info.usage) {
      const { inputTokens, outputTokens } = info.usage;
      node.usage = { inputTokens, outputTokens };
    }
    if (node.kind === 'step') {
      node.action = info.action;
      node.text = info.text;
    } else if (node.kind === 'translate') {
      node.dsl = info.dsl;
    } else if (node.kind === 'query' && info.data && info.schema) {
      node.result = {
        columns: info.schema.map(({ name, type }) => ({ name, type })),
        returnedRows: info.data.length,
        truncated: info.truncated,
        truncatedBy: info.truncatedBy,
        preview: info.data.length ? resultPreview(info.data) : undefined,
      };
    } else if (node.kind === 'summarize') {
      node.queryExplanation = info.queryExplanation;
      node.conclusion = info.conclusion;
      node.limitations = info.limitations;
      node.nextStep = info.nextStep;
    }
  };

  return {
    async run<Result>(operation: () => Promise<Result>): Promise<Result> {
      try {
        for (const name of eventNames) ava.on(name, record);
        const result = await activeCapture.run(capture, operation);
        finishTrace(capture, 'completed');
        return result;
      } catch (error) {
        finishTrace(capture, 'failed', error);
        throw error;
      } finally {
        for (const name of eventNames) ava.off(name, record);
      }
    },

    toJSON(): AnalysisTrace {
      return capture.trace;
    },
  };
}
