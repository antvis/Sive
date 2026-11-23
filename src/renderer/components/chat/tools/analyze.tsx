import type { AnalysisResponse } from '@antv/ava';
import { isAnalysisToolResult } from '@shared/analysis-trace';
import type {
  AnalysisTrace,
  AnalysisTraceOperation,
  AnalysisTraceStatus,
  AnalysisTraceStep,
} from '@shared/analysis-trace';
import { Tabs } from 'radix-ui';
import { ChevronRightIcon } from 'lucide-react';
import { useState } from 'react';
import type { ReactNode } from 'react';
import { toast } from 'sonner';
import { errorMessage, formatMetric } from '../../../utils';
import { cn } from '../../../lib/utils';
import { CodeBlock, CodeBlockCopyButton } from '../../ai-elements/code-block';
import { MessageResponse } from '../../ai-elements/message';
import { ToolOutput } from '../../ai-elements/tool';
import type { ToolPart } from '../../ai-elements/tool';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../../ui/collapsible';
import { Table } from '../../ui/table';

function cellText(value: unknown) {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return JSON.stringify(value);
}

function AnalysisTable({
  analysis,
  originalPrecision,
}: {
  analysis: AnalysisResponse;
  originalPrecision: boolean;
}) {
  const { data, schema: columns } = analysis;

  const numericColumn = (type?: string) => /INT|FLOAT|DOUBLE|REAL|DECIMAL|NUMERIC|NUMBER/i.test(type ?? '');

  if (data.length === 1 && columns.length === 1) {
    const column = columns[0];
    const value = data[0][column.name];

    return (
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 py-1">
        <span className="break-all text-3xl leading-tight font-medium tabular-nums" title={cellText(value)}>
          {typeof value === 'number' && !originalPrecision
            ? value.toLocaleString('zh-CN', { maximumFractionDigits: 3 })
            : cellText(value)}
        </span>
        <span className="break-all text-xs text-muted-foreground" title={column.type}>
          {column.name}
          {column.type && <span className="sr-only"> · {column.type}</span>}
        </span>
      </div>
    );
  }

  if (!columns.length) {
    return <pre className="m-0 whitespace-pre-wrap break-all text-xs">{JSON.stringify(data, null, 2)}</pre>;
  }

  return (
    <Table>
      <thead>
        <tr>
          {columns.map((column) => (
            <th
              key={column.name}
              scope="col"
              title={column.type ? `${column.name} · ${column.type}` : column.name}
              aria-label={column.type ? `${column.name} · ${column.type}` : column.name}
              className={cn(
                'sticky top-0 z-10 bg-card break-words',
                numericColumn(column.type) && 'text-right',
              )}
            >
              {column.name}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {data.map((row, index) => (
          <tr key={index}>
            {columns.map((column) => {
              const value = row[column.name];

              return (
                <td
                  key={column.name}
                  className={cn(
                    'min-w-20 whitespace-pre-wrap break-words',
                    numericColumn(column.type) && 'text-right whitespace-nowrap tabular-nums',
                  )}
                  title={cellText(value)}
                >
                  {typeof value === 'number' && !originalPrecision ? formatMetric(value) : cellText(value)}
                </td>
              );
            })}
          </tr>
        ))}
        {!data.length && (
          <tr>
            <td colSpan={columns.length} className="text-muted-foreground">
              未返回数据行。
            </td>
          </tr>
        )}
      </tbody>
    </Table>
  );
}

function AnalysisSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Collapsible className="min-w-0 border-t border-border" role="region" aria-label={title}>
      <CollapsibleTrigger className="group/analyze flex w-full flex-wrap items-center gap-2 rounded-sm bg-transparent py-2.5 text-left text-sm font-semibold text-foreground transition-colors hover:bg-muted/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
        <ChevronRightIcon
          className="size-3.5 shrink-0 text-muted-foreground transition-transform group-data-[state=open]/analyze:rotate-90 motion-reduce:transition-none"
          aria-hidden="true"
        />
        <span>{title}</span>
      </CollapsibleTrigger>
      <CollapsibleContent className="min-w-0 pb-3">{children}</CollapsibleContent>
    </Collapsible>
  );
}

function AnalysisResult({ analysis }: { analysis: AnalysisResponse }) {
  const [originalPrecision, setOriginalPrecision] = useState(false);
  const [view, setView] = useState('data');
  const selectedView = analysis.sql ? view : 'data';
  const content = analysis.markdown || analysis.text;
  const limitations =
    'limitations' in analysis && typeof analysis.limitations === 'string' && analysis.limitations.trim()
      ? analysis.limitations
      : undefined;
  // shortcut: only split the known loop headings; keep other formats intact until AVA provides structured fields.
  const confirmation = content.match(/^Verification:\s*\r?\n([\s\S]*?)\r?\n\s*Conclusion:\s*\r?\n([\s\S]+)$/);

  return (
    <div className="grid min-w-0 gap-4 text-sm leading-5 text-foreground/80">
      {(analysis.query || content || limitations) && (
        <section className="grid min-w-0 gap-2 rounded-lg bg-muted/50 p-3" aria-label="问题与结论">
          {analysis.query && (
            <p className="m-0 whitespace-pre-wrap break-words text-sm leading-6 text-foreground">
              {analysis.query}
            </p>
          )}
          {analysis.query && content && <hr className="m-0 border-border" />}
          {content && (
            <MessageResponse className="space-y-2 text-sm leading-6 text-foreground">
              {confirmation?.[2] ?? content}
            </MessageResponse>
          )}
          {limitations && (
            <div className="space-y-1">
              <p className="m-0 text-xs font-medium text-muted-foreground">分析局限</p>
              <MessageResponse className="space-y-1 text-xs leading-5 text-muted-foreground">
                {limitations}
              </MessageResponse>
            </div>
          )}
        </section>
      )}
      <Tabs.Root
        value={selectedView}
        onValueChange={setView}
        className="grid min-w-0 gap-2 border-t border-border pt-3"
      >
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
          <h4 className="m-0 text-sm font-semibold text-foreground">依据</h4>
          <Tabs.List className="flex gap-3" aria-label="查询依据视图">
            {analysis.sql && (
              <Tabs.Trigger
                value="sql"
                className="rounded-sm bg-transparent px-0 py-1 underline-offset-4 data-[state=active]:font-medium data-[state=active]:text-foreground data-[state=active]:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              >
                SQL
              </Tabs.Trigger>
            )}
            <Tabs.Trigger
              value="data"
              className="rounded-sm bg-transparent px-0 py-1 underline-offset-4 data-[state=active]:font-medium data-[state=active]:text-foreground data-[state=active]:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              Data
            </Tabs.Trigger>
          </Tabs.List>
          {selectedView === 'data' && (
            <div
              className="ml-auto flex flex-wrap items-center justify-end gap-x-3 gap-y-1 text-xs text-muted-foreground"
              role="group"
              aria-label="查询结果信息"
            >
              <span>
                {analysis.data.length} 行 · {analysis.schema.length} 列{analysis.truncated ? ' · 已截断' : ''}
              </span>
              {analysis.rowCount !== undefined && analysis.rowCount !== analysis.data.length && (
                <span>查询行数 {analysis.rowCount}</span>
              )}
              {analysis.data.length > 0 && (
                <label className="flex cursor-pointer items-center gap-1.5">
                  <input
                    type="checkbox"
                    checked={originalPrecision}
                    onChange={(event) => setOriginalPrecision(event.target.checked)}
                  />
                  <span>原始精度</span>
                </label>
              )}
            </div>
          )}
        </div>
        {analysis.sql && (
          <Tabs.Content value="sql" className="min-w-0 focus-visible:outline-2 focus-visible:outline-ring">
            <CodeBlock
              code={analysis.sql}
              language="sql"
              role="region"
              aria-label="执行 SQL"
              tabIndex={0}
              className="max-h-64 overflow-auto [&>div:last-child]:overflow-visible [&_pre]:p-3 [&_pre]:pr-12 [&_pre]:text-xs [&_pre]:leading-5 [&_code]:text-xs"
            >
              <div className="sticky top-0 left-0 z-10 h-0">
                <CodeBlockCopyButton
                  size="icon-xs"
                  className="absolute top-2 right-2 text-muted-foreground"
                  aria-label="复制完整 SQL"
                  onError={(error) => toast.error(errorMessage(error))}
                />
              </div>
            </CodeBlock>
          </Tabs.Content>
        )}
        <Tabs.Content value="data" className="min-w-0 focus-visible:outline-2 focus-visible:outline-ring">
          <div className="max-h-48 max-w-full overflow-auto" role="region" aria-label="结果数据" tabIndex={0}>
            <AnalysisTable analysis={analysis} originalPrecision={originalPrecision} />
          </div>
          {analysis.truncated && (
            <p className="m-0 text-xs text-muted-foreground" role="status">
              查询结果已截断
              {analysis.truncatedBy === 'maxRows'
                ? '（达到行数限制）'
                : analysis.truncatedBy === 'maxResultBytes'
                  ? '（达到大小限制）'
                  : ''}
              ，已返回 {analysis.data.length} 行；完整查询结果可能包含更多数据。
            </p>
          )}
        </Tabs.Content>
      </Tabs.Root>
      {confirmation && (
        <AnalysisSection title="核对说明">
          <MessageResponse className="space-y-1 text-xs leading-5 text-muted-foreground">
            {confirmation[1]}
          </MessageResponse>
        </AnalysisSection>
      )}
      {analysis.markdown && analysis.text && analysis.markdown !== analysis.text && (
        <AnalysisSection title="原始文本">
          <p className="m-0 whitespace-pre-wrap break-words text-xs text-muted-foreground">{analysis.text}</p>
        </AnalysisSection>
      )}
    </div>
  );
}

const statusLabels: Record<AnalysisTraceStatus, string> = {
  running: '进行中',
  completed: '成功',
  failed: '失败',
  cancelled: '已取消',
};

function TraceSection({
  label,
  status,
  durationMs,
  defaultOpen,
  usage,
  children,
}: {
  label: string;
  status?: AnalysisTraceStatus;
  durationMs?: number;
  defaultOpen?: boolean;
  usage?: AnalysisTraceOperation['usage'];
  children: ReactNode;
}) {
  let duration: string | undefined;
  if (durationMs !== undefined) {
    duration = durationMs < 1000 ? `${durationMs} ms` : `${(durationMs / 1000).toFixed(1)} 秒`;
  }

  return (
    <Collapsible defaultOpen={defaultOpen} className="min-w-0">
      <CollapsibleTrigger className="group/trace flex w-full items-start gap-2 rounded-sm px-1 py-1.5 text-left text-sm hover:bg-muted/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
        <ChevronRightIcon
          aria-hidden="true"
          className="mt-0.5 size-3.5 shrink-0 text-muted-foreground transition-transform group-data-[state=open]/trace:rotate-90 motion-reduce:transition-none"
        />
        <span className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <span className="font-medium text-foreground">{label}</span>
          {status && (
            <span
              className={cn('text-xs', status === 'failed' ? 'text-destructive' : 'text-muted-foreground')}
            >
              {statusLabels[status]}
            </span>
          )}
          {duration && <span className="text-xs text-muted-foreground tabular-nums">{duration}</span>}
        </span>
      </CollapsibleTrigger>
      <CollapsibleContent className="ml-2.5 min-w-0 space-y-2 border-l border-border pb-1 pl-3 [overflow-wrap:anywhere]">
        {children}
        {usage && (usage.inputTokens !== undefined || usage.outputTokens !== undefined) && (
          <p>
            输入 {usage.inputTokens ?? '—'} tokens · 输出 {usage.outputTokens ?? '—'} tokens
          </p>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
}

const actionLabels = { EXPLORE: '探索', REFINE: '调整方案', SQL: '生成答案查询', CONFIRM: '核验结果' };
const operationLabels = { translate: '生成语句', query: '执行查询', summarize: '总结结果' };

function TraceCode({ label, text }: { label: string; text: string }) {
  return (
    <pre
      aria-label={label}
      tabIndex={0}
      className="max-h-45 overflow-auto whitespace-pre-wrap rounded-md bg-muted/50 p-2 text-xs [overflow-wrap:anywhere] focus-visible:outline-2 focus-visible:outline-ring"
    >
      <code>{text}</code>
    </pre>
  );
}

function TraceOperation({
  operation,
  queryNumber = 0,
}: {
  operation: AnalysisTraceOperation;
  queryNumber?: number;
}) {
  const { kind, error, dsl, result, queryExplanation, conclusion, limitations, nextStep, usage } = operation;
  return (
    <TraceSection
      label={operationLabels[kind]}
      status={operation.status}
      durationMs={operation.durationMs}
      usage={usage}
    >
      <p>开始于 +{operation.atMs} ms</p>
      {error && <p className="whitespace-pre-wrap text-destructive [overflow-wrap:anywhere]">{error}</p>}
      {dsl && <TraceCode label="查询语句" text={dsl} />}
      {result && (
        <div className="space-y-1">
          <p>
            返回 {result.returnedRows} 行 · {result.columns.length} 列{result.truncated ? ' · 已截断' : ''}
          </p>
          {result.columns.length > 0 && (
            <p className="[overflow-wrap:anywhere]">
              {result.columns.map(({ name, type }) => (type ? `${name} (${type})` : name)).join('、')}
            </p>
          )}
          {result.preview && <TraceCode label="结果预览" text={result.preview} />}
        </div>
      )}
      {queryNumber > 0 && <p>依据本步第 {queryNumber} 次查询</p>}
      {queryExplanation && <p className="whitespace-pre-wrap">{queryExplanation}</p>}
      {conclusion && <p className="whitespace-pre-wrap">{conclusion}</p>}
      {limitations && <p className="whitespace-pre-wrap">局限 · {limitations}</p>}
      {nextStep && <p className="whitespace-pre-wrap">后续建议 · {nextStep}</p>}
    </TraceSection>
  );
}

function TraceStep({ step, trace }: { step: AnalysisTraceStep; trace: AnalysisTrace }) {
  const action = trace.strategy.type === 'loop' && step.action ? actionLabels[step.action] : undefined;
  const parents = trace.steps.filter(({ id }) => step.parentStepIds.includes(id));
  const queries = step.operations.filter(({ kind }) => kind === 'query');
  const attempts = new Map<number, AnalysisTraceOperation[]>();
  const operations: AnalysisTraceOperation[] = [];
  for (const operation of step.operations) {
    if (operation.attempt === undefined) {
      operations.push(operation);
    } else {
      const group = attempts.get(operation.attempt) ?? [];
      group.push(operation);
      attempts.set(operation.attempt, group);
    }
  }

  return (
    <TraceSection
      label={`第 ${step.index + 1} 步${step.finalAttempt ? ' · 最终尝试' : action ? ` · ${action}` : ''}`}
      status={step.status}
      durationMs={step.durationMs}
      defaultOpen={trace.strategy.type === 'direct'}
      usage={step.usage}
    >
      {parents.length > 0 && <p>依赖第 {parents.map(({ index }) => index + 1).join('、')} 步</p>}
      {step.error && (
        <p className="whitespace-pre-wrap text-destructive [overflow-wrap:anywhere]">{step.error}</p>
      )}
      {[...attempts].map(([index, group]) => (
        <TraceSection key={index} label={`第 ${index + 1} 次尝试`} status={group.at(-1)!.status} defaultOpen>
          {group.map((operation) => (
            <TraceOperation key={operation.id} operation={operation} />
          ))}
        </TraceSection>
      ))}
      {operations.map((operation) => (
        <TraceOperation
          key={operation.id}
          operation={operation}
          queryNumber={queries.findIndex(({ id }) => id === operation.queryId) + 1}
        />
      ))}
      {trace.strategy.type === 'loop' && step.text && (
        <p className="whitespace-pre-wrap [overflow-wrap:anywhere]">{step.text}</p>
      )}
    </TraceSection>
  );
}

function AnalysisTraceView({ trace }: { trace: AnalysisTrace }) {
  return (
    <div className="min-w-0 text-xs leading-relaxed text-muted-foreground">
      <TraceSection label="分析过程" status={trace.status} durationMs={trace.durationMs}>
        <p className="whitespace-pre-wrap [overflow-wrap:anywhere]">{trace.query}</p>
        {trace.error && (
          <p className="whitespace-pre-wrap text-destructive [overflow-wrap:anywhere]">{trace.error}</p>
        )}
        {trace.start.datasetId && (
          <p>
            数据集 ID <code>{trace.start.datasetId}</code>
          </p>
        )}
        {trace.steps.map((step) => (
          <TraceStep key={step.id} step={step} trace={trace} />
        ))}
      </TraceSection>
    </div>
  );
}

export function AnalyzeTool({ call, errorText }: { call: ToolPart; errorText?: string }) {
  const output =
    call.state === 'output-available' && isAnalysisToolResult(call.output) ? call.output : undefined;
  const analysis = output?.result;
  const trace = output?.trace;
  const error = errorText ?? (analysis === null ? (trace?.error ?? '分析未完成。') : undefined);
  if (!analysis && !trace && !error) return null;

  return (
    <div className="min-w-0 space-y-2">
      <ToolOutput
        className="[&_table]:text-xs"
        output={analysis ? <AnalysisResult analysis={analysis} /> : undefined}
        errorText={error}
      />
      {trace && <AnalysisTraceView trace={trace} />}
    </div>
  );
}
