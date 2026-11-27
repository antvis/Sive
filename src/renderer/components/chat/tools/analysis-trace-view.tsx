import { i18n, useI18n } from '../../../i18n';
import { translateError } from '@shared/i18n';
import type { AnalysisTrace, AnalysisTraceOperation, AnalysisTraceStep } from '@shared/analysis-trace';
import { DatabaseIcon, Maximize2Icon, Minimize2Icon } from 'lucide-react';
import { useMemo, useState } from 'react';
import { cn } from '../../../lib/utils';
import { MessageResponse } from '../../ai-elements/message';
import { SqlCodeBlock } from '../../ai-elements/sql';
import { Badge } from '../../ui/badge';
import { Button } from '../../ui/button';
import { Collapsible, CollapsibleContent, CollapsibleRowTrigger } from '../../ui/collapsible';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from '../../ui/dialog';
import { Table } from '../../ui/table';
import { AnalysisTraceFlowchart } from './analysis-trace-flowchart';
import type { TraceFlowEvent } from './analysis-trace-flowchart';

const statusLabels = {
  get running() {
    return i18n('analysis.status.running');
  },
  get completed() {
    return i18n('analysis.status.completed');
  },
  get failed() {
    return i18n('analysis.status.failed');
  },
  get cancelled() {
    return i18n('analysis.status.cancelled');
  },
};
const actionLabels = {
  get EXPLORE() {
    return i18n('analysis.actions.explore');
  },
  get REFINE() {
    return i18n('analysis.actions.refine');
  },
  get SQL() {
    return i18n('analysis.actions.query');
  },
  get CONFIRM() {
    return i18n('analysis.actions.verify');
  },
};
const operationLabels = {
  get translate() {
    return i18n('analysis.operations.translate');
  },
  get query() {
    return i18n('analysis.operations.query');
  },
  get summarize() {
    return i18n('analysis.operations.summarize');
  },
};

function formatDuration(ms?: number) {
  if (ms === undefined) return undefined;
  return ms < 1000
    ? i18n('analysis.duration.milliseconds', [ms])
    : i18n('analysis.duration.seconds', [(ms / 1000).toFixed(1)]);
}

function TraceUsage({ usage, className }: { usage: AnalysisTraceOperation['usage']; className?: string }) {
  useI18n();
  if (usage?.inputTokens === undefined && usage?.outputTokens === undefined) return null;
  return (
    <p className={cn('text-xs text-muted-foreground tabular-nums', className)}>
      {i18n('analysis.tokenUsage', [usage.inputTokens ?? '—', usage.outputTokens ?? '—'])}
    </p>
  );
}

function TraceCode({ label, text }: { label: string; text: string }) {
  useI18n();
  return (
    <div className="min-w-0 space-y-1">
      <p className="font-medium text-muted-foreground">{label}</p>
      <pre
        aria-label={label}
        tabIndex={0}
        className="rounded-md bg-muted/55 p-2.5 font-chat-mono text-sm whitespace-pre-wrap [overflow-wrap:anywhere] focus-visible:outline-1 focus-visible:outline-focus"
      >
        <code>{text}</code>
      </pre>
    </div>
  );
}

function QueryPreview({ columns, preview }: NonNullable<AnalysisTraceOperation['result']>) {
  useI18n();
  if (!preview) {
    return columns.length > 0 ? (
      <p className="text-muted-foreground">
        {columns.map(({ name, type }) => (type ? `${name} (${type})` : name)).join('、')}
      </p>
    ) : null;
  }

  let rows: unknown;
  try {
    rows = JSON.parse(preview);
  } catch {
    // Persisted previews can end in the middle of a row when the size cap is reached.
  }

  if (!columns.length || !Array.isArray(rows) || !rows.every((row) => row && typeof row === 'object')) {
    return <TraceCode label={i18n('analysis.trace.dataPreview')} text={preview} />;
  }

  return (
    <div className="min-w-0 space-y-1">
      <p className="font-medium text-muted-foreground">{i18n('analysis.trace.dataPreview')}</p>
      <div
        className="min-w-0 overflow-x-auto rounded-md border border-border focus-visible:outline-1 focus-visible:outline-focus"
        tabIndex={0}
        role="region"
        aria-label={i18n('analysis.trace.dataPreview')}
      >
        <Table className="[&_td]:min-w-16 [&_td]:max-w-40 [&_th]:whitespace-nowrap">
          <thead>
            <tr>
              {columns.map(({ name, type }) => (
                <th scope="col" key={name} title={type}>
                  {name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row: Record<string, unknown>, index) => (
              <tr key={index}>
                {columns.map(({ name }) => {
                  const value = row[name];

                  return (
                    <td key={name} className="tabular-nums">
                      {value == null ? '—' : typeof value === 'string' ? value : JSON.stringify(value)}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </Table>
      </div>
    </div>
  );
}

function TraceSummary({
  operation,
  queryNumber,
}: {
  operation: AnalysisTraceOperation;
  queryNumber?: number;
}) {
  useI18n();
  const { conclusion, queryExplanation, limitations, nextStep } = operation;
  const sections = [
    { title: i18n('analysis.result.conclusion'), text: conclusion, featured: true },
    { title: i18n('analysis.result.rationale'), text: queryExplanation, source: queryNumber },
    { title: i18n('analysis.result.limitations'), text: limitations },
    { title: i18n('analysis.result.nextSteps'), text: nextStep },
  ].filter(({ text, source }) => text?.trim() || source !== undefined);

  if (!sections.length) return null;

  return (
    <div className="grid min-w-0 gap-4">
      {sections.map(({ title, text, featured, source }) => (
        <section
          key={title}
          className={cn('min-w-0 space-y-1.5', featured && 'rounded-lg bg-muted/50 px-3 py-3.5')}
        >
          <h5 className="flex flex-wrap items-center gap-x-2 gap-y-1 font-semibold">
            {title}
            {source !== undefined && (
              <Badge variant="secondary" className="text-muted-foreground">
                {i18n('analysis.trace.queryLabel', [source])}
              </Badge>
            )}
          </h5>
          {text?.trim() && (
            <MessageResponse
              className={cn(
                'space-y-2 text-sm [&_li]:my-0.5',
                featured ? 'leading-6 text-foreground' : 'leading-5.5 text-foreground/85',
              )}
            >
              {text}
            </MessageResponse>
          )}
        </section>
      ))}
    </div>
  );
}

function TraceOperation({
  operation,
  queryNumbers,
  defaultOpen,
  showTrigger = true,
}: {
  operation: AnalysisTraceOperation;
  queryNumbers: Map<string, number>;
  defaultOpen: boolean;
  showTrigger?: boolean;
}) {
  useI18n();
  const { kind, status, error, dsl, result } = operation;
  const queryNumber = queryNumbers.get(operation.id);
  const summarySource = operation.queryId ? queryNumbers.get(operation.queryId) : undefined;
  const duration = formatDuration(operation.durationMs);
  const details = (
    <>
      {error && <p className="whitespace-pre-wrap text-destructive">{translateError(i18n.locale, error)}</p>}
      {dsl && (
        <div className="min-w-0 space-y-2">
          <p className="font-medium text-muted-foreground">{i18n('analysis.sql.title')}</p>
          <SqlCodeBlock code={dsl} label={i18n('analysis.sql.title')} />
        </div>
      )}
      {result && <QueryPreview {...result} />}
      {kind === 'summarize' && <TraceSummary operation={operation} queryNumber={summarySource} />}
      <TraceUsage
        usage={operation.usage}
        className={kind === 'summarize' ? 'border-t border-border/70 pt-3' : undefined}
      />
    </>
  );

  if (!showTrigger) {
    return <div className="min-w-0 space-y-4 [overflow-wrap:anywhere]">{details}</div>;
  }

  return (
    <Collapsible defaultOpen={defaultOpen}>
      <CollapsibleRowTrigger className="py-2.5">
        <span className="flex min-w-0 flex-1 flex-wrap items-baseline gap-x-2 gap-y-1">
          <span className="text-sm font-semibold text-foreground">
            {queryNumber ? i18n('analysis.trace.queryLabel', [queryNumber]) : operationLabels[kind]}
          </span>
          {status !== 'completed' && (
            <span className={status === 'failed' ? 'text-destructive' : 'text-muted-foreground'}>
              {statusLabels[status]}
            </span>
          )}
          {result && (
            <span className="text-xs text-muted-foreground tabular-nums">
              {i18n('analysis.trace.resultDimensions', [
                result.returnedRows,
                result.columns.length,
                result.truncated ? i18n('analysis.trace.truncatedSuffix') : '',
              ])}
            </span>
          )}
        </span>
        {duration && <span className="shrink-0 text-xs text-muted-foreground tabular-nums">{duration}</span>}
      </CollapsibleRowTrigger>
      <CollapsibleContent className="space-y-4 pt-1.5 pb-4 [overflow-wrap:anywhere]">
        {details}
      </CollapsibleContent>
    </Collapsible>
  );
}

function TraceStepDetail({ step, trace }: { step: AnalysisTraceStep; trace: AnalysisTrace }) {
  useI18n();
  const parents = trace.steps.filter(({ id }) => step.parentStepIds.includes(id));
  const queries = step.operations.filter(({ kind }) => kind === 'query');
  const queryNumbers = new Map(queries.map(({ id }, index) => [id, index + 1]));
  const statements = new Set(queries.map(({ dsl }) => dsl?.trim()));
  // Query events already carry the exact fenced statements in loop step text.
  const text =
    trace.strategy.type === 'loop'
      ? step.text
          ?.replace(/^[ \t]*```[^\r\n`]*\r?\n([\s\S]*?)^[ \t]*```[ \t]*\r?$/gm, (block, statement: string) =>
            statements.has(statement.trim()) ? '' : block,
          )
          .trim()
      : undefined;
  const confirmation =
    step.action === 'CONFIRM'
      ? text?.match(/^Verification:\s*\r?\n([\s\S]*?)(?:\r?\n\s*Conclusion:\s*\r?\n([\s\S]+))?$/)
      : undefined;

  return (
    <div className="min-w-0 space-y-4 [overflow-wrap:anywhere]">
      {parents.length > 0 && (
        <p className="text-muted-foreground">
          {i18n('analysis.trace.dependencies', [parents.map(({ index }) => index + 1).join('、')])}
        </p>
      )}
      {step.error && (
        <p className="whitespace-pre-wrap text-destructive">{translateError(i18n.locale, step.error)}</p>
      )}
      {confirmation ? (
        <div className="space-y-3">
          <div className="space-y-1">
            <h4 className="font-semibold">{i18n('analysis.trace.verificationNotes')}</h4>
            <MessageResponse className="space-y-1 text-sm">{confirmation[1]}</MessageResponse>
          </div>
          {confirmation[2] && (
            <div className="space-y-1 border-t border-border pt-3">
              <h4 className="font-semibold">{i18n('analysis.result.conclusion')}</h4>
              <MessageResponse className="space-y-1 text-sm">{confirmation[2]}</MessageResponse>
            </div>
          )}
        </div>
      ) : (
        text && <MessageResponse className="space-y-1 text-sm">{text}</MessageResponse>
      )}
      {step.operations.length > 0 && (
        <ol className="min-w-0 divide-y divide-border" aria-label={i18n('analysis.trace.executionLog')}>
          {step.operations.map((operation, index) => (
            <li key={operation.id} className="min-w-0">
              {operation.attempt !== undefined &&
                operation.attempt !== step.operations[index - 1]?.attempt && (
                  <p className="pt-2 text-xs font-medium text-muted-foreground">
                    {i18n('analysis.trace.attemptNumber', [operation.attempt + 1])}
                  </p>
                )}
              <TraceOperation
                operation={operation}
                queryNumbers={queryNumbers}
                defaultOpen={step.operations.length === 1}
              />
            </li>
          ))}
        </ol>
      )}
      {!text && !step.error && !step.operations.length && (
        <p className="text-muted-foreground">{i18n('analysis.trace.stepEmpty')}</p>
      )}
      <TraceUsage usage={step.usage} />
    </div>
  );
}

function hasFailedOperation(step: AnalysisTraceStep) {
  return step.operations.some(({ status }) => status === 'failed');
}

type TraceEvent = TraceFlowEvent &
  (
    | { kind: 'analysis' }
    | { kind: 'step'; step: AnalysisTraceStep }
    | { kind: 'operation'; step: AnalysisTraceStep; operation: AnalysisTraceOperation }
  );

const analysisId = 'analysis';

function getTraceEvents(trace: AnalysisTrace) {
  const stepsById = new Map(trace.steps.map((step) => [step.id, `step:${step.id}`]));
  const events: TraceEvent[] = [
    {
      id: analysisId,
      kind: 'analysis',
      parentIds: [],
      label:
        trace.strategy.type === 'loop'
          ? i18n('analysis.strategies.loop')
          : i18n('analysis.strategies.direct'),
      summary: i18n('analysis.trace.stepCountWithStatus', [trace.steps.length, statusLabels[trace.status]]),
      failed: trace.status === 'failed',
    },
  ];

  for (const step of trace.steps) {
    const stepId = `step:${step.id}`;
    const parents = [...new Set(step.parentStepIds)]
      .map((id) => stepsById.get(id))
      .filter((id): id is string => Boolean(id && id !== stepId));
    const title = step.finalAttempt
      ? i18n('analysis.trace.finalAttempt')
      : trace.strategy.type === 'direct'
        ? i18n('analysis.trace.directQuery')
        : step.action
          ? actionLabels[step.action]
          : i18n('analysis.trace.stepTitle');
    const warning = step.status === 'completed' && hasFailedOperation(step);
    events.push({
      id: stepId,
      kind: 'step',
      parentIds: parents.length ? parents : [analysisId],
      label: `${step.index + 1} · ${title}`,
      summary: [
        warning ? i18n('analysis.trace.failedOperations') : statusLabels[step.status],
        formatDuration(step.durationMs),
      ]
        .filter(Boolean)
        .join(' · '),
      failed: warning || step.status === 'failed',
      step,
    });

    let queryNumber = 0;
    for (const operation of step.operations) {
      const label =
        operation.kind === 'query'
          ? i18n('analysis.trace.queryLabel', [++queryNumber])
          : operationLabels[operation.kind];
      const attempt =
        operation.attempt === undefined
          ? undefined
          : i18n('analysis.trace.attemptNumber', [operation.attempt + 1]);
      const status = operation.status === 'completed' ? undefined : statusLabels[operation.status];
      events.push({
        id: `operation:${step.id}:${operation.id}`,
        kind: 'operation',
        parentIds: [stepId],
        label,
        summary:
          [attempt, status, formatDuration(operation.durationMs)].filter(Boolean).join(' · ') ||
          statusLabels[operation.status],
        failed: operation.status === 'failed',
        step,
        operation,
      });
    }
  }

  return events;
}

function TraceEventDetail({ event, trace }: { event: TraceEvent; trace: AnalysisTrace }) {
  useI18n();
  if (event.kind === 'step') return <TraceStepDetail step={event.step} trace={trace} />;

  if (event.kind === 'operation') {
    const queries = event.step.operations.filter(({ kind }) => kind === 'query');
    const queryNumbers = new Map(queries.map(({ id }, index) => [id, index + 1]));
    return (
      <TraceOperation
        operation={event.operation}
        queryNumbers={queryNumbers}
        defaultOpen
        showTrigger={event.operation.kind !== 'summarize'}
      />
    );
  }

  const dataset = trace.start.datasetName || trace.start.datasetId;
  const duration = formatDuration(trace.durationMs);
  return (
    <div className="min-w-0 space-y-2 [overflow-wrap:anywhere]">
      {trace.query && <p className="text-sm whitespace-pre-wrap">{trace.query}</p>}
      <p className="text-muted-foreground">{[dataset, duration].filter(Boolean).join(' · ')}</p>
      {trace.error && (
        <p className="whitespace-pre-wrap text-destructive">{translateError(i18n.locale, trace.error)}</p>
      )}
    </div>
  );
}

function TraceWorkspace({
  trace,
  events,
  selected,
  onSelect,
  fullscreen = false,
}: {
  trace: AnalysisTrace;
  events: TraceEvent[];
  selected: TraceEvent | undefined;
  onSelect: (id: string | undefined) => void;
  fullscreen?: boolean;
}) {
  useI18n();
  return (
    <div
      className={cn(
        'grid min-h-0 min-w-0',
        fullscreen &&
          (selected
            ? 'grid-rows-[minmax(0,1fr)_minmax(0,1fr)] md:grid-cols-[minmax(0,1fr)_minmax(20rem,32%)] md:grid-rows-1'
            : 'grid-rows-1'),
      )}
    >
      <AnalysisTraceFlowchart
        events={events}
        selectedId={selected?.id}
        onSelect={onSelect}
        fullscreen={fullscreen}
      />
      {selected && (
        <section
          className={cn(
            'flex min-h-0 min-w-0 flex-col overflow-hidden border-t border-border',
            fullscreen && 'md:border-t-0 md:border-l',
          )}
          aria-label={i18n('analysis.trace.nodeDetails')}
        >
          <header className="flex shrink-0 flex-wrap items-baseline gap-x-3 gap-y-1 border-b border-border px-3.5 py-3">
            <h4 className="text-sm font-semibold">{selected.label}</h4>
            <span
              className={cn('tabular-nums', selected.failed ? 'text-destructive' : 'text-muted-foreground')}
            >
              {selected.summary}
            </span>
          </header>
          <div
            key={selected.id}
            className={cn(
              'min-h-0 min-w-0 overflow-auto px-3.5 py-4 [scrollbar-gutter:stable] focus-visible:outline-1 focus-visible:-outline-offset-2 focus-visible:outline-ring',
              fullscreen ? 'overscroll-contain' : 'max-h-(--analysis-view-max-height) overscroll-x-contain',
            )}
            tabIndex={0}
          >
            <TraceEventDetail event={selected} trace={trace} />
          </div>
        </section>
      )}
    </div>
  );
}

export function AnalysisTraceView({ trace }: { trace: AnalysisTrace }) {
  useI18n();
  const { steps, start, status, strategy } = trace;
  const datasetLabel = start.datasetName || start.datasetId;
  const duration = formatDuration(trace.durationMs);
  const events = useMemo(() => getTraceEvents(trace), [trace, i18n.locale]);
  const [selectedId, setSelectedId] = useState<string>();
  const selected = events.find(({ id }) => id === selectedId);

  return (
    <Dialog>
      <section
        className="w-full min-w-0 overflow-hidden text-sm leading-relaxed text-foreground"
        aria-label={i18n('analysis.trace.title')}
      >
        <header className="flex items-center justify-between gap-2 pb-2">
          <div className="flex min-w-0 flex-wrap items-baseline gap-x-2.5 gap-y-0.5 text-muted-foreground">
            <span className="font-semibold text-foreground">
              {strategy.type === 'loop'
                ? i18n('analysis.strategies.loop')
                : i18n('analysis.strategies.direct')}
            </span>
            <span className={status === 'failed' ? 'text-destructive' : undefined}>
              {statusLabels[status]}
            </span>
            <span className="tabular-nums">{i18n('analysis.trace.stepCount', [steps.length])}</span>
            {duration && <span className="tabular-nums">{duration}</span>}
            {datasetLabel && (
              <span className="inline-flex min-w-0 items-center gap-1.5" title={datasetLabel}>
                <DatabaseIcon className="size-3 shrink-0" aria-hidden="true" />
                <span className="truncate">{datasetLabel}</span>
              </span>
            )}
          </div>
          {steps.length > 0 && (
            <DialogTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={i18n('analysis.flowchart.enterFullscreen')}
                title={i18n('analysis.flowchart.enterFullscreen')}
                className="text-black/50 dark:text-white/50"
              >
                <Maximize2Icon className="size-[14px]" aria-hidden />
              </Button>
            </DialogTrigger>
          )}
        </header>
        {steps.length > 0 ? (
          <TraceWorkspace trace={trace} events={events} selected={selected} onSelect={setSelectedId} />
        ) : (
          <p className="px-3.5 py-3 text-muted-foreground">{i18n('analysis.trace.noSteps')}</p>
        )}
      </section>
      {steps.length > 0 && (
        <DialogContent
          showCloseButton={false}
          className="top-0 left-0 grid h-dvh max-h-none w-screen max-w-none grid-rows-[auto_minmax(0,1fr)] translate-x-0 translate-y-0 overflow-hidden rounded-none border-0 bg-background p-0 text-sm leading-relaxed text-foreground shadow-none [&_[data-streamdown^=heading-]]:text-sm [&_[data-streamdown=table]_:is(th,td,code)]:text-sm"
        >
          <header className="min-w-0 border-b border-border">
            <div className="flex h-[44px] items-center justify-between gap-4 pr-4 pl-[88px] [-webkit-app-region:drag]">
              <DialogTitle className="font-semibold">{i18n('analysis.flowchart.title')}</DialogTitle>
              <DialogClose asChild>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={i18n('common.actions.exitFullscreen')}
                  title={i18n('common.actions.exitFullscreen')}
                  className="text-black/50 dark:text-white/50"
                >
                  <Minimize2Icon className="size-[14px]" aria-hidden />
                </Button>
              </DialogClose>
            </div>
            <DialogDescription className="truncate px-4 pb-3 text-sm" title={trace.query}>
              {trace.query}
            </DialogDescription>
          </header>
          <TraceWorkspace
            trace={trace}
            events={events}
            selected={selected}
            onSelect={setSelectedId}
            fullscreen
          />
        </DialogContent>
      )}
    </Dialog>
  );
}
