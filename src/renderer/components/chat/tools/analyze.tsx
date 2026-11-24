import type { AnalysisResponse } from '@antv/ava';
import { isAnalysisToolResult } from '@shared/analysis-trace';
import { Tabs } from 'radix-ui';
import { ChevronRightIcon, CodeXmlIcon, FileTextIcon, ListTreeIcon, Table2Icon } from 'lucide-react';
import { useState } from 'react';
import type { ReactNode } from 'react';
import { formatMetric } from '../../../utils';
import { cn } from '../../../lib/utils';
import { MessageResponse } from '../../ai-elements/message';
import { SqlCodeBlock } from '../../ai-elements/sql';
import type { ToolPart } from '../../ai-elements/tool';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../../ui/collapsible';
import { Table } from '../../ui/table';
import { AnalysisTraceView } from './analysis-trace-view';

const scrollContentClass =
  'max-h-(--analysis-view-max-height) w-full min-w-0 overflow-auto overscroll-contain [scrollbar-gutter:stable] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring';

const sectionTitleClass = 'text-sm font-semibold text-foreground';

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
      <div className="grid gap-1 py-2.5">
        <span className="text-xs text-muted-foreground [overflow-wrap:anywhere]" title={column.type}>
          {column.name}
          {column.type && <span className="sr-only"> · {column.type}</span>}
        </span>
        <span
          className="text-2xl leading-tight font-semibold tabular-nums [overflow-wrap:anywhere]"
          title={cellText(value)}
        >
          {typeof value === 'number' && !originalPrecision
            ? value.toLocaleString('zh-CN', { maximumFractionDigits: 3 })
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
              未返回数据行。
            </td>
          </tr>
        )}
      </tbody>
    </Table>
  );
}

function AnalysisSection({
  title,
  defaultOpen = false,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  return (
    <Collapsible defaultOpen={defaultOpen} className="min-w-0 space-y-1.5" role="region" aria-label={title}>
      <CollapsibleTrigger
        className={cn(
          sectionTitleClass,
          'group/analyze flex w-full items-center justify-between gap-2 rounded-sm text-left hover:text-foreground/75 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
        )}
      >
        <span>{title}</span>
        <ChevronRightIcon
          className="size-3.5 shrink-0 text-muted-foreground transition-transform group-data-[state=open]/analyze:rotate-90 motion-reduce:transition-none"
          aria-hidden="true"
        />
      </CollapsibleTrigger>
      <CollapsibleContent className="min-w-0">{children}</CollapsibleContent>
    </Collapsible>
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
  return (
    <div
      className={cn(scrollContentClass, 'grid grid-cols-1 gap-3 [overflow-wrap:anywhere]')}
      role="region"
      aria-label="结论正文"
      tabIndex={0}
    >
      {content && (
        <MessageResponse className="space-y-2 text-base leading-6 text-foreground">{content}</MessageResponse>
      )}
      {limitations && (
        <div className="space-y-1">
          <p className="text-xs font-medium text-foreground">分析局限</p>
          <MessageResponse className="space-y-1 text-sm leading-5 text-muted-foreground">
            {limitations}
          </MessageResponse>
        </div>
      )}
      {analysis.markdown && analysis.text && analysis.markdown !== analysis.text && (
        <AnalysisSection title="原始文本">
          <p className="whitespace-pre-wrap text-sm leading-5 text-muted-foreground">{analysis.text}</p>
        </AnalysisSection>
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
  const { data, schema, rowCount, truncated, truncatedBy } = analysis;

  return (
    <div className="w-full min-w-0 space-y-2">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
        <span className="tabular-nums">
          {data.length} 行 · {schema.length} 列
          {rowCount !== undefined && rowCount !== data.length && ` · 查询共 ${rowCount} 行`}
        </span>
        {data.length > 0 && (
          <label className="ml-auto flex cursor-pointer items-center gap-1.5">
            <input
              type="checkbox"
              className="accent-primary"
              checked={originalPrecision}
              onChange={(event) => onPrecisionChange(event.target.checked)}
            />
            原始精度
          </label>
        )}
      </div>
      <div className={scrollContentClass} role="region" aria-label="结果数据" tabIndex={0}>
        <AnalysisTable analysis={analysis} originalPrecision={originalPrecision} />
      </div>
      {truncated && (
        <p className="text-xs leading-5 text-muted-foreground" role="status">
          查询结果已截断
          {truncatedBy === 'maxRows'
            ? '（达到行数限制）'
            : truncatedBy === 'maxResultBytes'
              ? '（达到大小限制）'
              : ''}
          ，已返回 {data.length} 行。
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

export function AnalyzeTool({ call, errorText }: { call: ToolPart; errorText?: string }) {
  const [originalPrecision, setOriginalPrecision] = useState(false);
  const output = call.state === 'output-available' ? call.output : undefined;
  const savedResult = isAnalysisToolResult(output) ? output : undefined;
  const analysis = savedResult ? savedResult.result : isLegacyAnalysisResult(output) ? output : undefined;
  const trace = savedResult?.trace;
  const error =
    errorText ??
    trace?.error ??
    (analysis === null ? (trace?.status === 'cancelled' ? '分析已取消。' : '分析未完成。') : undefined);
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
      label: '结论',
      icon: FileTextIcon,
      content:
        analysis && (conclusion.trim() || limitations) ? (
          <AnalysisConclusion analysis={analysis} content={conclusion} limitations={limitations} />
        ) : null,
    },
    {
      value: 'data',
      label: '数据',
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
        <SqlCodeBlock code={analysis.sql} label="执行 SQL" maxHeight="var(--analysis-view-max-height)" />
      ) : null,
    },
    {
      value: 'trace',
      label: '过程回顾',
      icon: ListTreeIcon,
      content: trace ? <AnalysisTraceView trace={trace} /> : null,
    },
  ].filter((view) => view.content !== null);

  if (!views.length && !error) return null;

  return (
    <div className="@container grid w-full min-w-0 grid-cols-1 gap-3.5 rounded-lg bg-muted/50 p-3">
      {query && (
        <section className="min-w-0 space-y-1.5" aria-label="分析问题">
          <h4 className={sectionTitleClass}>分析问题</h4>
          <p className="text-sm leading-6 whitespace-pre-wrap text-foreground [overflow-wrap:anywhere]">
            {query}
          </p>
        </section>
      )}
      {error && (
        <p
          role="alert"
          className="text-sm leading-5 whitespace-pre-wrap text-destructive [overflow-wrap:anywhere]"
        >
          {error}
        </p>
      )}
      {views.length > 0 && (
        <Tabs.Root
          defaultValue={views[0].value}
          className="w-full min-w-0 [--analysis-view-max-height:min(24rem,50dvh)]"
        >
          <Tabs.List
            aria-label="分析结果视图"
            className="grid grid-cols-[repeat(auto-fit,minmax(min(3rem,100%),1fr))] gap-1"
          >
            {views.map(({ value, label, icon: Icon }) => (
              <Tabs.Trigger
                key={value}
                value={value}
                className="flex min-h-8 min-w-0 flex-col items-center justify-center gap-0.5 rounded-md py-1 text-sm leading-5 font-medium whitespace-nowrap text-muted-foreground hover:bg-card/60 hover:text-foreground focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring data-[state=active]:bg-card data-[state=active]:font-semibold data-[state=active]:text-foreground @xs:flex-row @xs:gap-1.5"
              >
                <Icon className="size-3.5 shrink-0" aria-hidden="true" />
                {label}
              </Tabs.Trigger>
            ))}
          </Tabs.List>
          {views.map(({ value, content }) => (
            <Tabs.Content
              key={value}
              value={value}
              className="mt-2.5 w-full min-w-0 rounded-lg bg-card px-3 py-2.5 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
            >
              {content}
            </Tabs.Content>
          ))}
        </Tabs.Root>
      )}
      {confirmation && (
        <AnalysisSection title="核对说明" defaultOpen>
          <MessageResponse className="space-y-2 text-sm leading-6 text-foreground [overflow-wrap:anywhere]">
            {confirmation[1]}
          </MessageResponse>
        </AnalysisSection>
      )}
    </div>
  );
}
