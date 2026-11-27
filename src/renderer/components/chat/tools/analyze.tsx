import type { Translator } from '@shared/i18n';
import { useI18n } from '../../../i18n';
import { translateError } from '@shared/i18n';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../ui/tabs';
import type { AnalysisResponse } from '@antv/ava';
import { isAnalysisToolResult } from '@shared/analysis-trace';
import {
  CodeXmlIcon,
  FileTextIcon,
  ListTreeIcon,
  SearchIcon,
  SquareArrowOutUpRightIcon,
  Table2Icon,
} from 'lucide-react';
import { useContext, useState } from 'react';
import { formatMetric } from '../../../utils';
import { cn } from '../../../lib/utils';
import { MessageResponse } from '../../ai-elements/message';
import { SqlCodeBlock } from '../../ai-elements/sql';
import { getToolErrorText } from '../../ai-elements/tool';
import type { ToolPart } from '../../ai-elements/tool';
import { Button } from '../../ui/button';
import { Checkbox } from '../../ui/checkbox';
import { CollapsibleSection } from '../../ui/collapsible-section';
import { Table } from '../../ui/table';
import { Tooltip, TooltipContent, TooltipTrigger } from '../../ui/tooltip';
import { ToolCallView } from '../tool-call';
import { ToolPreviewContext } from '../tool-preview';
import { AnalysisTraceView } from './analysis-trace-view';

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
  const i18n = useI18n();
  const { data, schema: columns } = analysis;

  const numericColumn = (type?: string) => /INT|FLOAT|DOUBLE|REAL|DECIMAL|NUMERIC|NUMBER/i.test(type ?? '');

  if (data.length === 1 && columns.length === 1) {
    const column = columns[0];
    const value = data[0][column.name];

    return (
      <div className="grid gap-1 py-2.5">
        <span className="text-xs text-muted-foreground [overflow-wrap:anywhere]" title={column.type}>
          {column.name}
          {column.type && <span className="sr-only"> · {column.type}</span>}
        </span>
        <span
          className="text-sm leading-tight font-semibold tabular-nums [overflow-wrap:anywhere]"
          title={cellText(value)}
        >
          {typeof value === 'number' && !originalPrecision
            ? value.toLocaleString(i18n.locale, { maximumFractionDigits: 3 })
            : cellText(value)}
        </span>
      </div>
    );
  }

  if (!columns.length) {
    return <pre className="m-0 whitespace-pre-wrap break-all text-sm">{JSON.stringify(data, null, 2)}</pre>;
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
              {i18n('analysis.result.noRows')}
            </td>
          </tr>
        )}
      </tbody>
    </Table>
  );
}

function AnalysisConclusion({
  analysis,
  content,
  limitations,
}: {
  analysis: AnalysisResponse;
  content: string;
  limitations?: string;
}) {
  const i18n = useI18n();
  return (
    <div
      className={cn(
        'max-h-(--analysis-view-max-height) w-full min-w-0 overflow-auto overscroll-x-contain [scrollbar-gutter:stable] focus-visible:outline-1 focus-visible:-outline-offset-2 focus-visible:outline-ring',
        'grid grid-cols-1 gap-3 [overflow-wrap:anywhere]',
      )}
      role="region"
      aria-label={i18n('analysis.result.conclusionLabel')}
      tabIndex={0}
    >
      {content && (
        <MessageResponse className="space-y-2 text-sm leading-6 text-foreground">{content}</MessageResponse>
      )}
      {limitations && (
        <div className="space-y-1">
          <p className="text-xs font-medium text-foreground">{i18n('analysis.result.limitations')}</p>
          <MessageResponse className="space-y-1 text-xs leading-5 text-muted-foreground">
            {limitations}
          </MessageResponse>
        </div>
      )}
      {analysis.markdown && analysis.text && analysis.markdown !== analysis.text && (
        <CollapsibleSection title={i18n('analysis.result.originalText')}>
          <p className="whitespace-pre-wrap text-xs leading-5 text-muted-foreground">{analysis.text}</p>
        </CollapsibleSection>
      )}
    </div>
  );
}

function AnalysisData({
  analysis,
  originalPrecision,
  onPrecisionChange,
}: {
  analysis: AnalysisResponse;
  originalPrecision: boolean;
  onPrecisionChange: (value: boolean) => void;
}) {
  const i18n = useI18n();
  const { data, schema, rowCount, truncated, truncatedBy } = analysis;

  return (
    <div className="w-full min-w-0 space-y-2">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
        <span className="tabular-nums">
          {i18n('analysis.result.dimensions', [
            data.length,
            schema.length,
            rowCount !== undefined &&
              rowCount !== data.length &&
              i18n('analysis.result.totalRowsSuffix', [rowCount]),
          ])}
        </span>
        {data.length > 0 && (
          <label className="ml-auto flex cursor-pointer items-center gap-1.5">
            <Checkbox
              checked={originalPrecision}
              onChange={(event) => onPrecisionChange(event.target.checked)}
            />
            {i18n('analysis.result.originalPrecision')}
          </label>
        )}
      </div>
      <div
        className={
          'max-h-(--analysis-view-max-height) w-full min-w-0 overflow-auto overscroll-x-contain [scrollbar-gutter:stable] focus-visible:outline-1 focus-visible:-outline-offset-2 focus-visible:outline-ring'
        }
        role="region"
        aria-label={i18n('analysis.result.dataLabel')}
        tabIndex={0}
      >
        <AnalysisTable analysis={analysis} originalPrecision={originalPrecision} />
      </div>
      {truncated && (
        <p className="text-xs leading-5 text-muted-foreground" role="status">
          {i18n('analysis.result.truncatedDescription', [
            truncatedBy === 'maxRows'
              ? i18n('analysis.result.rowLimitReason')
              : truncatedBy === 'maxResultBytes'
                ? i18n('analysis.result.sizeLimitReason')
                : '',
            data.length,
          ])}
        </p>
      )}
    </div>
  );
}

function isLegacyAnalysisResult(value: unknown): value is AnalysisResponse {
  return (
    typeof value === 'object' &&
    value !== null &&
    'query' in value &&
    typeof value.query === 'string' &&
    'text' in value &&
    typeof value.text === 'string' &&
    'schema' in value &&
    Array.isArray(value.schema) &&
    'data' in value &&
    Array.isArray(value.data)
  );
}

function getAnalysisDetails(i18n: Translator, call: ToolPart) {
  const output = call.state === 'output-available' ? call.output : undefined;
  const savedResult = isAnalysisToolResult(output) ? output : undefined;
  const analysis = savedResult ? savedResult.result : isLegacyAnalysisResult(output) ? output : undefined;
  const trace = savedResult?.trace;
  const error =
    getToolErrorText(i18n, call) ??
    trace?.error ??
    (analysis === null
      ? trace?.status === 'cancelled'
        ? i18n('errors.analysis.cancelled')
        : i18n('errors.analysis.incomplete')
      : undefined);

  return { analysis, trace, error: error ? translateError(i18n.locale, error) : undefined };
}

export function AnalyzeToolCall({ call, messageId }: { call: ToolPart; messageId: string }) {
  const i18n = useI18n();
  const { analysis, trace, error } = getAnalysisDetails(i18n, call);
  const openToolPreview = useContext(ToolPreviewContext);
  const onOpenPreview = openToolPreview
    ? (title: string) =>
        openToolPreview({
          id: `tool-${encodeURIComponent(JSON.stringify([messageId, call.toolCallId]))}`,
          title,
          call,
        })
    : undefined;

  return (
    <ToolCallView
      call={call}
      title={i18n('analysis.tools.analyze')}
      icon={SearchIcon}
      state={analysis === null ? 'output-error' : call.state}
      expandOn={analysis || trace || error ? 'completed' : 'never'}
    >
      <AnalyzeTool call={call} onOpenPreview={onOpenPreview} />
    </ToolCallView>
  );
}

export function AnalyzeTool({
  call,
  onOpenPreview,
  sidePanel,
}: {
  call: ToolPart;
  onOpenPreview?: (title: string) => void;
  sidePanel?: boolean;
}) {
  const i18n = useI18n();
  const [originalPrecision, setOriginalPrecision] = useState(false);
  const { analysis, trace, error } = getAnalysisDetails(i18n, call);
  const input = call.input;
  const inputQuery =
    input && typeof input === 'object' && 'query' in input && typeof input.query === 'string'
      ? input.query
      : undefined;
  const query = analysis?.query || trace?.query || inputQuery;
  const content = analysis?.markdown || analysis?.text || '';
  // shortcut: only split the known loop headings; keep other formats intact until AVA provides structured fields.
  const confirmation = content.match(/^Verification:\s*\r?\n([\s\S]*?)\r?\n\s*Conclusion:\s*\r?\n([\s\S]+)$/);
  const conclusion = confirmation?.[2] ?? content;
  const limitations =
    analysis && 'limitations' in analysis && typeof analysis.limitations === 'string'
      ? analysis.limitations.trim()
      : undefined;

  const views = [
    {
      value: 'conclusion',
      label: i18n('analysis.result.conclusion'),
      icon: FileTextIcon,
      content:
        analysis && (conclusion.trim() || limitations) ? (
          <AnalysisConclusion analysis={analysis} content={conclusion} limitations={limitations} />
        ) : null,
    },
    {
      value: 'data',
      label: i18n('common.labels.data'),
      icon: Table2Icon,
      content: analysis ? (
        <AnalysisData
          analysis={analysis}
          originalPrecision={originalPrecision}
          onPrecisionChange={setOriginalPrecision}
        />
      ) : null,
    },
    {
      value: 'sql',
      label: 'SQL',
      icon: CodeXmlIcon,
      content: analysis?.sql ? (
        <SqlCodeBlock
          code={analysis.sql}
          label={i18n('analysis.result.sqlTab')}
          maxHeight={sidePanel ? undefined : 'var(--analysis-view-max-height)'}
        />
      ) : null,
    },
    {
      value: 'trace',
      label: i18n('analysis.result.processTab'),
      icon: ListTreeIcon,
      content: trace ? <AnalysisTraceView trace={trace} /> : null,
    },
  ].filter((view) => view.content !== null);

  if (!views.length && !error) return null;

  const queryContent = query && (
    <p className="text-sm leading-6 whitespace-pre-wrap text-foreground [overflow-wrap:anywhere]">{query}</p>
  );
  const errorContent = error && (
    <p
      role="alert"
      className="text-sm leading-5 whitespace-pre-wrap text-destructive [overflow-wrap:anywhere]"
    >
      {error}
    </p>
  );

  return (
    <div
      className={cn(
        '@container grid w-full min-w-0 grid-cols-1 [&_[data-streamdown^=heading-]]:text-sm [&_[data-streamdown=table]_:is(th,td,code)]:text-sm',
        sidePanel ? 'gap-3 [--analysis-view-max-height:none]' : 'gap-3.5 rounded-lg bg-muted/25 p-3',
      )}
    >
      {sidePanel && queryContent && (
        <CollapsibleSection title={i18n('chat.input.label')} defaultOpen>
          {queryContent}
        </CollapsibleSection>
      )}
      {!sidePanel && (queryContent || onOpenPreview) && (
        <div className="flex items-start gap-2">
          {queryContent && (
            <section className="min-w-0 flex-1 space-y-1.5" aria-label={i18n('chat.input.label')}>
              <h4 className={'text-sm font-semibold text-foreground'}>{i18n('chat.input.label')}</h4>
              {queryContent}
            </section>
          )}
          {onOpenPreview && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={i18n('analysis.result.openInSidePanel')}
                  className="ms-auto text-black/50 dark:text-white/50"
                  onClick={() => onOpenPreview(query?.trim() || i18n('analysis.result.title'))}
                >
                  <SquareArrowOutUpRightIcon className="size-[14px]" aria-hidden />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{i18n('analysis.result.openInSideTab')}</TooltipContent>
            </Tooltip>
          )}
        </div>
      )}
      {errorContent &&
        (sidePanel ? (
          <CollapsibleSection title={i18n('analysis.statusLabel')} defaultOpen>
            {errorContent}
          </CollapsibleSection>
        ) : (
          errorContent
        ))}
      {sidePanel &&
        views.map(({ value, label, icon, content }) => (
          <CollapsibleSection key={value} title={label} icon={icon} defaultOpen>
            {content}
          </CollapsibleSection>
        ))}
      {!sidePanel && views.length > 0 && (
        <Tabs
          defaultValue={views[0].value}
          className="w-full min-w-0 [--analysis-view-max-height:min(24rem,50dvh)]"
        >
          <TabsList aria-label={i18n('analysis.result.viewsLabel')} className="w-full">
            {views.map(({ value, label, icon: Icon }) => (
              <TabsTrigger key={value} value={value} className="flex-1">
                <Icon className="size-3.5 shrink-0" aria-hidden="true" />
                {label}
              </TabsTrigger>
            ))}
          </TabsList>
          {views.map(({ value, content }) => (
            <TabsContent key={value} value={value} className="mt-2.5 w-full rounded-lg bg-card px-3 py-2.5">
              {content}
            </TabsContent>
          ))}
        </Tabs>
      )}
      {confirmation && (
        <CollapsibleSection title={i18n('analysis.trace.verificationNotes')} defaultOpen>
          <MessageResponse className="space-y-2 text-sm leading-6 text-foreground [overflow-wrap:anywhere]">
            {confirmation[1]}
          </MessageResponse>
        </CollapsibleSection>
      )}
    </div>
  );
}
