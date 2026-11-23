import {
  ChartColumnIcon,
  ChartLineIcon,
  Columns3Icon,
  DatabaseIcon,
  SearchIcon,
  TagsIcon,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { getToolName, isToolOutputErrorUIPart } from 'ai';
import type { Profile, Schema, Semantic } from '@antv/ava';
import { isAnalysisToolResult } from '@shared/analysis-trace';
import { Tool, ToolContent, ToolHeader, ToolOutput } from '../ai-elements/tool';
import type { ToolPart } from '../ai-elements/tool';
import { SourceTool } from './tools/source';
import type { SourceResult } from './tools/source';
import { SchemaTool } from './tools/schema';
import { ProfileTool } from './tools/profile';
import { SemanticTool } from './tools/semantic';
import { AnalyzeTool } from './tools/analyze';
import { VisualizeTool } from './tools/visualize';
import type { VisualizationResult } from './tools/visualize';

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

function toolContent(
  toolName: string,
  call: ToolPart,
  {
    messageId,
    savedMessageIds,
    isStreaming,
  }: { messageId: string; savedMessageIds: string[]; isStreaming: boolean },
): ReactNode {
  const errorText = isToolOutputErrorUIPart(call)
    ? call.errorText
    : call.state === 'output-denied'
      ? '工具执行已拒绝。'
      : undefined;
  if (toolName === 'analyze') return <AnalyzeTool call={call} errorText={errorText} />;

  let content: ReactNode;
  if (call.state === 'output-available') {
    const { output } = call;
    if (toolName === 'source') content = <SourceTool source={output as SourceResult} />;
    if (toolName === 'schema') content = <SchemaTool schema={output as Schema} />;
    if (toolName === 'profile') content = <ProfileTool profile={output as Profile} />;
    if (toolName === 'semantic') content = <SemanticTool semantic={output as Semantic} />;
    if (toolName === 'visualize') {
      content = (
        <VisualizeTool
          visualization={output as VisualizationResult | null | undefined}
          messageId={messageId}
          saved={savedMessageIds.includes(messageId)}
          isStreaming={isStreaming}
        />
      );
    }
  }
  return <ToolOutput className="[&_table]:text-xs" output={content} errorText={errorText} />;
}

export function ToolCallView({
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
  const failedAnalysis =
    toolName === 'analyze' &&
    call.state === 'output-available' &&
    isAnalysisToolResult(call.output) &&
    call.output.result === null;
  const state = failedAnalysis ? 'output-error' : call.state;
  const completed = state === 'output-available' || state === 'output-error' || state === 'output-denied';
  const [expanded, setExpanded] = useState(
    !completed || (toolName === 'analyze' && !hasVisualization) || toolName === 'visualize',
  );

  useEffect(() => {
    setExpanded(!completed || (toolName === 'analyze' && !hasVisualization) || toolName === 'visualize');
  }, [completed, toolName, hasVisualization]);

  const header =
    call.type === 'dynamic-tool'
      ? { type: call.type, toolName: call.toolName, state }
      : { type: call.type, state };

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
          {toolContent(toolName, call, { messageId, savedMessageIds, isStreaming })}
        </div>
      </ToolContent>
    </Tool>
  );
}
