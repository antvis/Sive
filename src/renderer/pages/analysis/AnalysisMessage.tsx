import {
  CaretDown,
  ChartBar,
  ChartLineUp,
  CheckCircle,
  CircleNotch,
  Columns,
  Database,
  FileCsv,
  MagnifyingGlass,
  Tag,
  Wrench,
  XCircle,
} from '@phosphor-icons/react';
import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import type { AnalysisResponse, Profile, Schema, Semantic, VisualizeResponse } from '@antv/ava';
import type { AnalysisMessage, AnalysisTaskEvent } from '../../types';
import { Markdown, SqlBlock } from '../../components/Markdown';

type StreamPart = NonNullable<AnalysisTaskEvent['part']>;
type ToolCallPart = Extract<StreamPart, { type: 'tool-call' }>;

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

function visualizationSummary(visualization: VisualizeResponse | null | undefined) {
  if (!visualization) return '未生成图表。';
  const chartNames: Record<string, string> = {
    line: '折线图',
    column: '柱状图',
    bar: '条形图',
    pie: '饼图',
    area: '面积图',
    scatter: '散点图',
    histogram: '直方图',
    radar: '雷达图',
    funnel: '漏斗图',
    table: '数据表格',
  };
  const chartName = chartNames[visualization.chartType] ?? visualization.chartType;
  const title = visualization.config.title;
  return `已根据分析结果生成${typeof title === 'string' && title ? `“${title}”` : ''}${chartName}。`;
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

function Chart({ html }: { html?: string }) {
  if (!html) return null;
  return (
    <iframe
      title="分析图表"
      srcDoc={html}
      sandbox="allow-scripts"
      className="block h-80 w-full max-w-full rounded-md border-0 bg-page"
    />
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
          <span className="grid size-8 shrink-0 place-items-center rounded-md bg-[#25804d14] text-[#25804d]">
            <FileCsv size={18} />
          </span>
          <span className="min-w-0 break-words text-sm font-medium text-ink">{source.name}</span>
          <span className="shrink-0 text-xs text-muted">
            {source.sourceType.replace(/-file$/i, '').toUpperCase()}
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
  if (toolName === 'visualize') {
    const visualization = output as VisualizeResponse | null | undefined;
    return (
      <div className="grid min-w-0 gap-3">
        <p className="m-0 text-sm leading-6 text-muted">{visualizationSummary(visualization)}</p>
        <Chart html={visualization?.html} />
      </div>
    );
  }
  return null;
}

function ToolCallView({ call, parts }: { call: ToolCallPart; parts: StreamPart[] }) {
  const result = parts.find(
    (part) =>
      (part.type === 'tool-result' || part.type === 'tool-error') && part.toolCallId === call.toolCallId,
  );
  const resultType = result?.type;
  const [expanded, setExpanded] = useState(
    !result || call.toolName === 'analyze' || call.toolName === 'visualize',
  );

  useEffect(() => {
    setExpanded(!resultType || call.toolName === 'analyze' || call.toolName === 'visualize');
  }, [resultType, call.toolName]);

  const failed = resultType === 'tool-error';
  const StatusIcon = !result ? CircleNotch : failed ? XCircle : CheckCircle;
  const ToolIcon = toolIcons[call.toolName as keyof typeof toolIcons] ?? Wrench;
  const input = call.input as { query?: unknown };
  const query = call.toolName === 'analyze' && typeof input.query === 'string' ? input.query : '';
  let summary = query;
  if (result?.type === 'tool-result') {
    if (call.toolName === 'source') summary = (result.output as SourceResult).name;
    if (call.toolName === 'schema') summary = schemaSummary(result.output as Schema);
    if (call.toolName === 'profile') summary = profileSummary(result.output as Profile);
    if (call.toolName === 'semantic') summary = semanticSummary(result.output as Semantic);
    if (call.toolName === 'visualize') {
      summary = visualizationSummary(result.output as VisualizeResponse | null | undefined);
    }
  }
  const content = result?.type === 'tool-result' ? toolContent(call.toolName, result.output) : null;

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
          {toolLabels[call.toolName] ?? call.toolName}
        </span>
        {summary && (!expanded || call.toolName === 'analyze') && (
          <span className="min-w-0 flex-1 truncate text-xs text-muted" title={summary}>
            {summary}
          </span>
        )}
        <span className="flex-1" />
        <StatusIcon
          size={15}
          className={
            !result
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

function StreamContent({ parts }: { parts: StreamPart[] }) {
  const blocks: ReactNode[] = [];
  for (let index = 0; index < parts.length; index += 1) {
    const part = parts[index];
    if (part.type === 'text-delta') {
      const start = index;
      let text = part.text;
      let next = parts[index + 1];
      while (next?.type === 'text-delta') {
        text += next.text;
        index += 1;
        next = parts[index + 1];
      }
      blocks.push(
        <div key={`text-${start}`} className="p-3">
          <Markdown>{text}</Markdown>
        </div>,
      );
    } else if (part.type === 'tool-call') {
      blocks.push(<ToolCallView key={part.toolCallId} call={part} parts={parts} />);
    }
  }
  return <div className="grid min-w-0 gap-2">{blocks}</div>;
}

export function AnalysisMessageView({
  message,
  activeTask,
  streamParts = [],
}: {
  message: AnalysisMessage;
  activeTask?: AnalysisTaskEvent | null;
  streamParts?: StreamPart[];
}) {
  if (message.role === 'user') {
    return (
      <div className="flex justify-end">
        <p className="m-0 min-w-0 max-w-[85%] rounded-xl bg-accent-soft px-4 py-3 text-sm leading-6 break-words whitespace-pre-wrap">
          {message.content.question}
        </p>
      </div>
    );
  }

  if (message.status === 'error') {
    return <p className="m-0 text-sm text-danger">{message.content.error || '分析失败，请重试。'}</p>;
  }
  if (message.status === 'cancelled' || message.status === 'interrupted') {
    return (
      <p className="m-0 text-sm text-muted">
        {message.status === 'cancelled' ? '分析已取消。' : '分析已中断。'}
      </p>
    );
  }

  const running = message.status === 'running' || message.status === 'cancelling';
  const parts = running ? streamParts : (message.content.parts ?? []);
  if (parts.length) return <StreamContent parts={parts} />;
  if (running) {
    return (
      <p className="m-0 text-sm text-muted">
        {activeTask?.taskId === message.id ? activeTask.stage : message.content.stage || '正在分析…'}
      </p>
    );
  }

  return (
    <div className="grid min-w-0 gap-4">
      {message.content.text && <Markdown>{message.content.text}</Markdown>}
      <Chart html={message.content.chartHtml} />
      <AnalysisTable analysis={message.content} />
    </div>
  );
}
