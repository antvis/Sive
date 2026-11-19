import {
  CaretDown,
  ChartBar,
  ChartLineUp,
  CheckCircle,
  CircleNotch,
  Columns,
  Database,
  MagnifyingGlass,
  Tag,
  Wrench,
  XCircle,
} from '@phosphor-icons/react';
import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { getToolName, isTextUIPart, isToolOutputErrorUIPart, isToolUIPart } from 'ai';
import type { DynamicToolUIPart, ToolUIPart, UIMessage } from 'ai';
import type { AnalysisResponse, Profile, Schema, Semantic } from '@antv/ava';
import { DataSourceLogo } from '../../components/DataSourceLogo';
import { Markdown, SqlBlock } from '../../components/Markdown';
import { findDatasetSource } from '@shared/dataSource';
import { AnalysisChart } from './AnalysisChart';
import type { VisualizationResult } from './AnalysisChart';

type ToolPart = ToolUIPart | DynamicToolUIPart;

type SourceResult = {
  name: string;
  sourceType: string;
  rowCount?: unknown;
  columnCount: number;
  fileSize?: number;
};

const toolLabels: Record<string, string> = {
  source: '加载数据源',
  schema: '识别数据字段',
  profile: '统计数据概况',
  semantic: '应用语义层',
  analyze: '分析数据',
  visualize: '生成图表',
};

const toolIcons = {
  source: Database,
  schema: Columns,
  profile: ChartBar,
  semantic: Tag,
  analyze: MagnifyingGlass,
  visualize: ChartLineUp,
};

function cellText(value: unknown) {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return JSON.stringify(value);
}

function formatFileSize(value?: number) {
  if (value === undefined) return '—';
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${Math.round(value / 1024)} KB`;
  return `${(value / 1024 / 1024).toFixed(1)} MB`;
}

function schemaSummary(schema: Schema) {
  const columns = schema.models.flatMap((model) => model.columns);
  const names = columns.slice(0, 4).map((column) => column.name);
  const suffix = names.length
    ? `，包括 ${names.join('、')}${columns.length > names.length ? ' 等' : ''}`
    : '';
  return `识别到 ${schema.models.length} 个数据模型，共 ${columns.length} 个字段${suffix}。`;
}

function formatMetric(value: number) {
  return value.toLocaleString('zh-CN', { maximumFractionDigits: 2 });
}

function profileSummary(profile: Profile) {
  const columns = profile.models.flatMap((model) => model.columns);
  const rowCount = profile.models[0]?.metrics.row_count;
  const labels = { numeric: '数值', string: '文本', date: '日期', boolean: '布尔', unknown: '其他' };
  const counts = columns.reduce<Record<string, number>>((result, column) => {
    const type = column.properties.logicalType;
    result[type] = (result[type] ?? 0) + 1;
    return result;
  }, {});
  const types = Object.entries(counts).map(
    ([type, count]) => `${count} 个${labels[type as keyof typeof labels]}字段`,
  );
  const rows = typeof rowCount === 'number' ? `${formatMetric(rowCount)} 行` : '行数未知';
  return `共 ${rows}、${columns.length} 个字段${types.length ? `；${types.join('、')}` : ''}。`;
}

function ProfileDetails({ profile }: { profile: Profile }) {
  const columns = profile.models.flatMap((model) => model.columns);
  const rowCount = profile.models[0]?.metrics.row_count;
  const hasNullMetrics = columns.some((column) => typeof column.metrics.null_count === 'number');
  const nullColumns = columns.filter((column) => {
    const count = column.metrics.null_count;
    return typeof count === 'number' && count > 0;
  });
  const nullCount = columns.reduce((total, column) => {
    const count = column.metrics.null_count;
    return total + (typeof count === 'number' ? count : 0);
  }, 0);
  const totalCells = typeof rowCount === 'number' ? rowCount * columns.length : 0;
  const nullRate = totalCells ? `，空值率 ${((nullCount / totalCells) * 100).toFixed(2)}%` : '';
  const numericColumns = columns.filter((column) => column.properties.logicalType === 'numeric');

  return (
    <div className="grid min-w-0 gap-2 break-words text-sm leading-6 text-muted">
      <p className="m-0">{profileSummary(profile)}</p>
      {hasNullMetrics && (
        <p className="m-0">
          {nullColumns.length
            ? `${nullColumns.length} 个字段存在空值，共 ${formatMetric(nullCount)} 个空值${nullRate}。`
            : '未发现空值。'}
        </p>
      )}
      {numericColumns.slice(0, 2).map((column) => {
        const { min, max, mean } = column.metrics;
        const details = [
          typeof mean === 'number' ? `均值 ${formatMetric(mean)}` : '',
          typeof min === 'number' && typeof max === 'number'
            ? `范围 ${formatMetric(min)}～${formatMetric(max)}`
            : '',
        ].filter(Boolean);
        return details.length ? (
          <p key={column.name} className="m-0">
            {column.name}：{details.join('，')}。
          </p>
        ) : null;
      })}
    </div>
  );
}

function semanticSummary(semantic: Semantic) {
  if (semantic.description) return semantic.description;
  const models = semantic.models?.length ?? 0;
  const fields = semantic.models?.reduce((count, model) => count + (model.columns?.length ?? 0), 0) ?? 0;
  const cubes = semantic.cubes?.length ?? 0;
  const relationships = semantic.relationships?.length ?? 0;
  const summaries = [
    models ? `${models} 个数据模型` : '',
    fields ? `${fields} 个语义字段` : '',
    cubes ? `${cubes} 个业务指标` : '',
    relationships ? `${relationships} 个数据关系` : '',
  ].filter(Boolean);
  return summaries.length
    ? `已应用业务语义层，包含 ${summaries.join('、')}。`
    : '已应用语义层，当前数据集未配置额外业务描述。';
}

function hasChart(output: VisualizationResult | null | undefined): output is VisualizationResult {
  return Boolean(output?.spec && output.title);
}

function AnalysisTable({ analysis }: { analysis: Partial<AnalysisResponse> }) {
  const { data = [], schema: columns = [] } = analysis;
  if (!data.length) return null;
  return (
    <div className="max-w-full overflow-auto rounded-md bg-page p-2">
      <table className="w-full border-collapse text-xs">
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column.name} className="border-b px-2 py-2 text-left font-medium text-muted">
                {column.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.slice(0, 20).map((row, index) => (
            <tr key={index}>
              {columns.map((column) => (
                <td
                  key={column.name}
                  className="max-w-48 truncate border-b px-2 py-2 text-ink/80"
                  title={cellText(row[column.name])}
                >
                  {cellText(row[column.name])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {data.length > 20 && <p className="mt-2 mb-0 text-xs text-muted">仅展示前 20 行</p>}
    </div>
  );
}

function toolContent(toolName: string, output: unknown): ReactNode {
  if (toolName === 'source') {
    const source = output as SourceResult;
    const stats = [
      { label: '文件大小', value: formatFileSize(source.fileSize) },
      {
        label: '行数',
        value: typeof source.rowCount === 'number' ? formatMetric(source.rowCount) : '—',
      },
      { label: '列数', value: formatMetric(source.columnCount) },
    ];
    return (
      <div className="rounded-lg bg-page p-4">
        <div className="flex items-center gap-2.5">
          <span className="grid size-8 shrink-0 place-items-center rounded-md bg-surface">
            <DataSourceLogo type={source.sourceType} size={18} />
          </span>
          <span className="min-w-0 break-words text-sm font-medium text-ink">{source.name}</span>
          <span className="shrink-0 text-xs text-muted">
            {findDatasetSource(source.sourceType)?.label ?? source.sourceType}
          </span>
        </div>
        <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2">
          {stats.map((stat) => (
            <div key={stat.label} className="flex items-baseline gap-1.5 text-xs">
              <span className="text-muted">{stat.label}</span>
              <span className="text-ink/80">{stat.value}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  if (toolName === 'schema')
    return <p className="m-0 text-sm leading-6 text-muted">{schemaSummary(output as Schema)}</p>;
  if (toolName === 'profile') return <ProfileDetails profile={output as Profile} />;
  if (toolName === 'semantic') {
    return <p className="m-0 text-sm leading-6 text-muted">{semanticSummary(output as Semantic)}</p>;
  }
  if (toolName === 'analyze') {
    const analysis = output as AnalysisResponse;
    const content = analysis.markdown || analysis.text;
    return (
      <div className="grid min-w-0 gap-3">
        {content && (
          <div className="text-ink/80">
            <Markdown>{content}</Markdown>
          </div>
        )}
        {analysis.sql && <SqlBlock code={analysis.sql} />}
        <AnalysisTable analysis={analysis} />
      </div>
    );
  }
  if (toolName === 'visualize') return <p className="m-0 text-sm leading-6 text-muted">未生成图表。</p>;
  return null;
}

function ToolCallView({
  call,
  messageId,
  savedMessageIds,
  hasVisualization,
  isStreaming,
}: {
  call: ToolPart;
  messageId: string;
  savedMessageIds: string[];
  hasVisualization: boolean;
  isStreaming: boolean;
}) {
  const toolName = getToolName(call);
  const completed =
    call.state === 'output-available' || call.state === 'output-error' || call.state === 'output-denied';
  const [expanded, setExpanded] = useState(
    !completed || (toolName === 'analyze' && !hasVisualization) || toolName === 'visualize',
  );

  useEffect(() => {
    setExpanded(!completed || (toolName === 'analyze' && !hasVisualization) || toolName === 'visualize');
  }, [completed, toolName, hasVisualization]);

  const failed = isToolOutputErrorUIPart(call) || call.state === 'output-denied';
  const StatusIcon = !completed ? CircleNotch : failed ? XCircle : CheckCircle;
  const ToolIcon = toolIcons[toolName as keyof typeof toolIcons] ?? Wrench;
  const input = call.input as { query?: unknown } | undefined;
  const query = toolName === 'analyze' && typeof input?.query === 'string' ? input.query : '';
  let summary = query;
  if (call.state === 'output-available') {
    if (toolName === 'source') summary = (call.output as SourceResult).name;
    if (toolName === 'schema') summary = schemaSummary(call.output as Schema);
    if (toolName === 'profile') summary = profileSummary(call.output as Profile);
    if (toolName === 'semantic') summary = semanticSummary(call.output as Semantic);
    if (toolName === 'visualize') summary = '未生成图表。';
  }
  const visualization =
    toolName === 'visualize' && call.state === 'output-available'
      ? (call.output as VisualizationResult | null | undefined)
      : undefined;
  if (hasChart(visualization)) {
    return (
      <AnalysisChart
        visualization={visualization}
        messageId={messageId}
        saved={savedMessageIds.includes(messageId)}
        isStreaming={isStreaming}
      />
    );
  }
  const content =
    call.state === 'output-available' ? (
      toolContent(toolName, call.output)
    ) : isToolOutputErrorUIPart(call) ? (
      <p className="m-0 text-sm text-danger">{call.errorText}</p>
    ) : null;

  return (
    <div className="group min-w-0">
      <button
        type="button"
        aria-expanded={expanded}
        className="flex min-w-0 w-full items-center gap-2 rounded-md px-2 py-2 text-left hover:bg-page"
        onClick={() => setExpanded((current) => !current)}
      >
        <ToolIcon size={16} className="shrink-0 text-muted" />
        <span className={`shrink-0 text-sm font-medium ${failed ? 'text-danger' : 'text-ink'}`}>
          {toolLabels[toolName] ?? toolName}
        </span>
        {summary && (!expanded || toolName === 'analyze') && (
          <span className="min-w-0 flex-1 truncate text-xs text-muted" title={summary}>
            {summary}
          </span>
        )}
        <span className="flex-1" />
        <StatusIcon
          size={15}
          className={
            !completed
              ? 'shrink-0 animate-spin text-muted'
              : failed
                ? 'shrink-0 text-danger'
                : 'shrink-0 text-[#25804d]'
          }
        />
        <CaretDown
          size={14}
          className={`shrink-0 text-muted opacity-0 transition-[opacity,transform] group-hover:opacity-100 group-focus-within:opacity-100 ${expanded ? '' : '-rotate-90'}`}
        />
      </button>
      {expanded && content && <div className="mt-1 mr-2 mb-3 ml-8 min-w-0">{content}</div>}
    </div>
  );
}

function StreamContent({
  parts,
  messageId,
  savedMessageIds,
  isStreaming,
}: {
  parts: UIMessage['parts'];
  messageId: string;
  savedMessageIds: string[];
  isStreaming: boolean;
}) {
  const visualizedAnalysis = new Set<string>();
  let analysisId: string | undefined;
  for (const part of parts) {
    if (!isToolUIPart(part)) continue;
    const toolName = getToolName(part);
    if (toolName === 'analyze') analysisId = part.toolCallId;
    if (
      toolName === 'visualize' &&
      analysisId &&
      part.state === 'output-available' &&
      hasChart(part.output as VisualizationResult | null | undefined)
    ) {
      visualizedAnalysis.add(analysisId);
    }
  }
  return (
    <div className="grid min-w-0 gap-2">
      {parts.map((part, index) => {
        if (isTextUIPart(part))
          return (
            <div key={index} className="p-3">
              <Markdown>{part.text}</Markdown>
            </div>
          );
        if (isToolUIPart(part))
          return (
            <ToolCallView
              key={part.toolCallId}
              call={part}
              hasVisualization={visualizedAnalysis.has(part.toolCallId)}
              messageId={messageId}
              savedMessageIds={savedMessageIds}
              isStreaming={isStreaming}
            />
          );
        return null;
      })}
    </div>
  );
}

export function AnalysisMessageView({
  message,
  savedMessageIds = [],
  isStreaming = false,
}: {
  message: UIMessage;
  savedMessageIds?: string[];
  isStreaming?: boolean;
}) {
  if (message.role === 'user') {
    return (
      <div className="flex justify-end">
        <p className="m-0 min-w-0 max-w-[85%] rounded-xl bg-accent-soft px-4 py-3 text-sm leading-6 break-words whitespace-pre-wrap">
          {message.parts
            .filter(isTextUIPart)
            .map((part) => part.text)
            .join('')}
        </p>
      </div>
    );
  }
  return (
    <StreamContent
      parts={message.parts}
      messageId={message.id}
      savedMessageIds={savedMessageIds}
      isStreaming={isStreaming}
    />
  );
}
