import type { Profile, Schema, Semantic } from '@antv/ava';
import { getToolName } from 'ai';
import { ChartColumnIcon, Columns3Icon, DatabaseIcon, TagsIcon } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { getToolErrorText, ToolOutput } from '../../ai-elements/tool';
import type { ToolPart } from '../../ai-elements/tool';
import { ToolCallView } from '../tool-call';
import { AnalyzeToolCall } from './analyze';
import { ProfileTool } from './profile';
import { SchemaTool } from './schema';
import { SemanticTool } from './semantic';
import { SourceTool } from './source';
import type { SourceResult } from './source';
import { VisualizeToolCall } from './visualize';

const dataTools = new Map<
  string,
  {
    title: string;
    icon: LucideIcon;
    render: (output: unknown) => ReactNode;
  }
>([
  [
    'source',
    {
      title: '读取数据源',
      icon: DatabaseIcon,
      render: (output) => <SourceTool source={output as SourceResult} />,
    },
  ],
  [
    'schema',
    {
      title: '解析数据结构',
      icon: Columns3Icon,
      render: (output) => <SchemaTool schema={output as Schema} />,
    },
  ],
  [
    'profile',
    {
      title: '计算统计指标',
      icon: ChartColumnIcon,
      render: (output) => <ProfileTool profile={output as Profile} />,
    },
  ],
  [
    'semantic',
    {
      title: '应用业务语义',
      icon: TagsIcon,
      render: (output) => <SemanticTool semantic={output as Semantic} />,
    },
  ],
]);

export function ChatToolCall({
  call,
  messageId,
  savedMessageIds,
  isStreaming,
}: {
  call: ToolPart;
  messageId: string;
  savedMessageIds: string[];
  isStreaming: boolean;
}) {
  const name = getToolName(call);
  if (name === 'analyze') return <AnalyzeToolCall call={call} messageId={messageId} />;
  if (name === 'visualize') {
    return (
      <VisualizeToolCall
        call={call}
        messageId={messageId}
        saved={savedMessageIds.includes(messageId)}
        isStreaming={isStreaming}
      />
    );
  }

  const tool = dataTools.get(name);
  const errorText = getToolErrorText(call);
  const output =
    call.state === 'output-available' && call.output != null ? tool?.render(call.output) : undefined;
  const expandOn = tool ? (output || errorText ? 'click' : 'never') : 'running';

  return (
    <ToolCallView call={call} title={tool?.title} icon={tool?.icon} expandOn={expandOn}>
      <ToolOutput output={output} errorText={errorText} />
    </ToolCallView>
  );
}
