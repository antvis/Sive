import {
  ChartColumnIcon,
  ChartLineIcon,
  Columns3Icon,
  DatabaseIcon,
  SearchIcon,
  TagsIcon,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { getToolName, isTextUIPart, isToolOutputErrorUIPart, isToolUIPart } from 'ai';
import type { DynamicToolUIPart, ToolUIPart, UIMessage } from 'ai';
import type { AnalysisResponse, Profile, Schema, Semantic } from '@antv/ava';
import { DataSourceLogo } from '../DataSourceLogo';
import { CodeBlock } from '../ai-elements/code-block';
import { Message, MessageContent, MessageResponse } from '../ai-elements/message';
import { Button } from '../ui/button';
import { Tool, ToolContent, ToolHeader, ToolOutput } from '../ai-elements/tool';
import { findDatasetSource } from '@shared/dataSource';
import type { ChatMessage } from '@shared/api';
import { AnalysisChart } from './analysis-chart';
import type { VisualizationResult } from './analysis-chart';
import { MessageActions } from './message-actions';

type ToolPart = ToolUIPart | DynamicToolUIPart;

type SourceResult = {
  name: string;
  sourceType: string;
  rowCount?: unknown;
  columnCount: number;
  fileSize?: number;
};

const toolLabels: Record<string, string> = {
  source: '读取数据源',
  schema: '解析数据结构',
  profile: '计算统计指标',
  semantic: '应用业务语义',
  analyze: '分析数据',
  visualize: '绘制图表',
};

const toolIcons: Record<string, LucideIcon> = {
  source: DatabaseIcon,
  schema: Columns3Icon,
  profile: ChartColumnIcon,
  semantic: TagsIcon,
  analyze: SearchIcon,
  visualize: ChartLineIcon,
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
    <div className="grid min-w-0 gap-4 break-words text-sm leading-6 text-muted-foreground">
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
    <div className="max-w-full overflow-auto rounded-md bg-muted/50 p-2">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr>
            {columns.map((column) => (
              <th
                key={column.name}
                className="border-b px-2 py-2 text-left font-medium text-muted-foreground"
              >
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
                  className="max-w-48 truncate border-b px-2 py-2 text-foreground/80"
                  title={cellText(row[column.name])}
                >
                  {cellText(row[column.name])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {data.length > 20 && <p className="mt-2 mb-0 text-xs text-muted-foreground">仅展示前 20 行</p>}
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
      <div className="rounded-lg bg-muted/50 p-4">
        <div className="flex items-center gap-2.5">
          <span className="grid size-8 shrink-0 place-items-center rounded-md bg-background">
            <DataSourceLogo type={source.sourceType} size={18} />
          </span>
          <span className="min-w-0 break-words text-sm font-medium text-foreground">{source.name}</span>
          <span className="shrink-0 text-xs text-muted-foreground">
            {findDatasetSource(source.sourceType)?.label ?? source.sourceType}
          </span>
        </div>
        <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2">
          {stats.map((stat) => (
            <div key={stat.label} className="flex items-baseline gap-1.5 text-xs">
              <span className="text-muted-foreground">{stat.label}</span>
              <span className="text-foreground/80">{stat.value}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  if (toolName === 'schema')
    return <p className="m-0 text-sm leading-6 text-muted-foreground">{schemaSummary(output as Schema)}</p>;
  if (toolName === 'profile') return <ProfileDetails profile={output as Profile} />;
  if (toolName === 'semantic') {
    return (
      <p className="m-0 text-sm leading-6 text-muted-foreground">{semanticSummary(output as Semantic)}</p>
    );
  }
  if (toolName === 'analyze') {
    const analysis = output as AnalysisResponse;
    const content = analysis.markdown || analysis.text;
    return (
      <div className="grid min-w-0 gap-4">
        {content && (
          <div className="text-foreground/80">
            <MessageResponse className="leading-6">{content}</MessageResponse>
          </div>
        )}
        {analysis.sql && <CodeBlock code={analysis.sql} language="sql" />}
        <AnalysisTable analysis={analysis} />
      </div>
    );
  }
  if (toolName === 'visualize')
    return <p className="m-0 text-sm leading-6 text-muted-foreground">未生成图表。</p>;
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
  const ToolIcon = toolIcons[toolName];
  const completed =
    call.state === 'output-available' || call.state === 'output-error' || call.state === 'output-denied';
  const [expanded, setExpanded] = useState(
    !completed || (toolName === 'analyze' && !hasVisualization) || toolName === 'visualize',
  );

  useEffect(() => {
    setExpanded(!completed || (toolName === 'analyze' && !hasVisualization) || toolName === 'visualize');
  }, [completed, toolName, hasVisualization]);

  const visualization =
    toolName === 'visualize' && call.state === 'output-available'
      ? (call.output as VisualizationResult | null | undefined)
      : undefined;
  const content =
    call.state === 'output-available' ? (
      hasChart(visualization) ? (
        <AnalysisChart
          visualization={visualization}
          messageId={messageId}
          saved={savedMessageIds.includes(messageId)}
          isStreaming={isStreaming}
        />
      ) : (
        toolContent(toolName, call.output)
      )
    ) : null;
  const header =
    call.type === 'dynamic-tool'
      ? { type: call.type, toolName: call.toolName, state: call.state }
      : { type: call.type, state: call.state };
  const errorText = isToolOutputErrorUIPart(call)
    ? call.errorText
    : call.state === 'output-denied'
      ? '工具执行已拒绝。'
      : undefined;

  return (
    <Tool
      className="mb-0 rounded-none border-0 bg-transparent p-0"
      open={expanded}
      onOpenChange={setExpanded}
    >
      <ToolHeader
        {...header}
        title={toolLabels[toolName] ?? toolName}
        icon={ToolIcon ? <ToolIcon className="size-4 text-muted-foreground" aria-hidden="true" /> : undefined}
      />
      <ToolContent className="p-0">
        <div className="ml-4 border-l border-border py-3 pl-4">
          <ToolOutput
            className="[&>div]:text-sm [&>div]:leading-6"
            output={content ?? undefined}
            errorText={errorText}
          />
        </div>
      </ToolContent>
    </Tool>
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
    <div className="grid min-w-0 gap-4">
      {parts.map((part, index) => {
        if (isTextUIPart(part))
          return (
            <MessageResponse key={index}>
              {part.text}
            </MessageResponse>
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

function UserMessageContent({ text }: { text: string }) {
  const contentId = useId();
  const contentRef = useRef<HTMLDivElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [overflowing, setOverflowing] = useState(false);

  useLayoutEffect(() => {
    const content = contentRef.current;
    if (!content) return;

    const measure = () => {
      const lineHeight = Number.parseFloat(getComputedStyle(content).lineHeight);
      setOverflowing(content.scrollHeight > lineHeight * 6 + 1);
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(content);
    return () => observer.disconnect();
  }, [text]);

  return (
    <>
      <div id={contentId} className={expanded ? undefined : 'max-h-[10.5rem] overflow-hidden'}>
        <div ref={contentRef} onFocusCapture={() => setExpanded(true)}>
          <MessageResponse>{text}</MessageResponse>
        </div>
      </div>
      {overflowing && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-auto self-start rounded-sm p-0 text-sm font-normal text-muted-foreground hover:bg-transparent hover:text-foreground aria-expanded:bg-transparent"
          aria-expanded={expanded}
          aria-controls={contentId}
          onClick={() => setExpanded((value) => !value)}
        >
          {expanded ? '收起' : '展示更多'}
        </Button>
      )}
    </>
  );
}

export function PreviewMessage({
  message,
  savedMessageIds = [],
  isStreaming = false,
}: {
  message: ChatMessage;
  savedMessageIds?: string[];
  isStreaming?: boolean;
}) {
  const isUser = message.role === 'user';

  return (
    <Message
      from={message.role}
      className={cn(
        'group/message max-w-full',
        isUser && 'motion-safe:animate-fade-up',
      )}
    >
      <div className={isUser ? 'flex flex-col items-end gap-2' : 'flex min-w-0'}>
        <MessageContent
          className={cn(
            isUser
              ? 'chat-user-message w-fit max-w-[min(80%,56ch)] overflow-hidden break-words rounded-2xl rounded-br-lg border border-border/30 bg-gradient-to-br from-secondary to-muted px-3.5 py-2 text-base leading-7 shadow-[var(--shadow-card)]'
              : 'min-w-0 flex-1 text-base leading-7',
          )}
        >
          {isUser ? (
            <UserMessageContent
              text={message.parts
                .filter(isTextUIPart)
                .map((part) => part.text)
                .join('')}
            />
          ) : (
            <StreamContent
              parts={message.parts}
              messageId={message.id}
              savedMessageIds={savedMessageIds}
              isStreaming={isStreaming}
            />
          )}
        </MessageContent>
      </div>
      <MessageActions message={message} isStreaming={isStreaming} />
    </Message>
  );
}
