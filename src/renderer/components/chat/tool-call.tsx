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
import type { AnalysisResponse, Profile, Schema, Semantic } from '@antv/ava';
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

function toolContent(toolName: string, output: unknown): ReactNode {
  if (toolName === 'source') return <SourceTool source={output as SourceResult} />;
  if (toolName === 'schema') return <SchemaTool schema={output as Schema} />;
  if (toolName === 'profile') return <ProfileTool profile={output as Profile} />;
  if (toolName === 'semantic') return <SemanticTool semantic={output as Semantic} />;
  if (toolName === 'analyze') return <AnalyzeTool analysis={output as AnalysisResponse} />;
  return null;
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
  const completed =
    call.state === 'output-available' || call.state === 'output-error' || call.state === 'output-denied';
  const [expanded, setExpanded] = useState(
    !completed || (toolName === 'analyze' && !hasVisualization) || toolName === 'visualize',
  );

  useEffect(() => {
    setExpanded(!completed || (toolName === 'analyze' && !hasVisualization) || toolName === 'visualize');
  }, [completed, toolName, hasVisualization]);

  const content =
    call.state === 'output-available' ? (
      toolName === 'visualize' ? (
        <VisualizeTool
          visualization={call.output as VisualizationResult | null | undefined}
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
            className="[&>div]:text-sm [&>div]:leading-6 [&_table]:text-xs"
            output={content ?? undefined}
            errorText={errorText}
          />
        </div>
      </ToolContent>
    </Tool>
  );
}
