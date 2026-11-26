import {
  ChartColumnIcon,
  ChartLineIcon,
  Columns3Icon,
  DatabaseIcon,
  SearchIcon,
  TagsIcon,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { getToolName } from 'ai';
import type { Profile, Schema, Semantic } from '@antv/ava';
import { isAnalysisToolResult } from '@shared/analysis-trace';
import type { SnippetContent } from '@shared/schema';
import { getToolErrorText, Tool, ToolHeader, ToolOutput } from '../ai-elements/tool';
import type { ToolPart } from '../ai-elements/tool';
import { CollapsibleInlineContent } from '../ui/collapsible';
import { ToolPreviewContext } from './tool-preview';
import { SourceTool } from './tools/source';
import type { SourceResult } from './tools/source';
import { SchemaTool } from './tools/schema';
import { ProfileTool } from './tools/profile';
import { SemanticTool } from './tools/semantic';
import { AnalyzeTool } from './tools/analyze';
import { VisualizeTool } from './tools/visualize';

const tools: Partial<Record<string, { title: string; icon: LucideIcon }>> = {
  source: { title: '读取数据源', icon: DatabaseIcon },
  schema: { title: '解析数据结构', icon: Columns3Icon },
  profile: { title: '计算统计指标', icon: ChartColumnIcon },
  semantic: { title: '应用业务语义', icon: TagsIcon },
  analyze: { title: '分析数据', icon: SearchIcon },
  visualize: { title: '绘制图表', icon: ChartLineIcon },
};

function renderOutput(
  toolName: string,
  output: unknown,
  messageId: string,
  saved: boolean,
  isStreaming: boolean,
): ReactNode {
  switch (toolName) {
    case 'source':
      return <SourceTool source={output as SourceResult} />;
    case 'schema':
      return <SchemaTool schema={output as Schema} />;
    case 'profile':
      return <ProfileTool profile={output as Profile} />;
    case 'semantic':
      return <SemanticTool semantic={output as Semantic} />;
    case 'visualize':
      return (
        <VisualizeTool
          visualization={output as SnippetContent | null | undefined}
          messageId={messageId}
          saved={saved}
          isStreaming={isStreaming}
        />
      );
    default:
      return null;
  }
}

export function ToolCallView({
  call,
  messageId,
  saved,
  isStreaming,
}: {
  call: ToolPart;
  messageId: string;
  saved: boolean;
  isStreaming: boolean;
}) {
  const toolName = getToolName(call);
  const ToolIcon = tools[toolName]?.icon;
  const isAnalysis = toolName === 'analyze';
  const failedAnalysis =
    isAnalysis &&
    call.state === 'output-available' &&
    isAnalysisToolResult(call.output) &&
    call.output.result === null;
  const state = failedAnalysis ? 'output-error' : call.state;
  const completed = state === 'output-available' || state === 'output-error' || state === 'output-denied';
  const defaultExpanded = !completed || isAnalysis || toolName === 'visualize';
  const [expanded, setExpanded] = useState(defaultExpanded);
  const openToolPreview = useContext(ToolPreviewContext);
  const openPreview = isAnalysis && completed && openToolPreview
    ? (title: string) => openToolPreview({
        id: `tool-${encodeURIComponent(JSON.stringify([messageId, call.toolCallId]))}`,
        title,
        call,
      })
    : undefined;

  useEffect(() => {
    setExpanded(defaultExpanded);
  }, [defaultExpanded]);

  return (
    <Tool open={expanded} onOpenChange={setExpanded}>
      <ToolHeader
        state={state}
        title={tools[toolName]?.title ?? toolName}
        icon={ToolIcon ? <ToolIcon className="size-4 text-muted-foreground" aria-hidden="true" /> : undefined}
      />
      <CollapsibleInlineContent>
        {isAnalysis ? (
          <AnalyzeTool call={call} onOpenPreview={openPreview} />
        ) : (
          <ToolOutput
            output={
              call.state === 'output-available'
                ? renderOutput(toolName, call.output, messageId, saved, isStreaming)
                : undefined
            }
            errorText={getToolErrorText(call)}
          />
        )}
      </CollapsibleInlineContent>
    </Tool>
  );
}
