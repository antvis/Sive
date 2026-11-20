import type { AnalysisResponse } from '@antv/ava';
import { Tabs } from 'radix-ui';
import { ChevronRightIcon } from 'lucide-react';
import { useState } from 'react';
import type { ReactNode } from 'react';
import { toast } from 'sonner';
import { errorMessage, formatMetric } from '../../../utils';
import { cn } from '../../../lib/utils';
import { CodeBlock, CodeBlockCopyButton } from '../../ai-elements/code-block';
import { MessageResponse } from '../../ai-elements/message';
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

export function AnalyzeTool({ analysis }: { analysis: AnalysisResponse }) {
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
