import { i18n, useI18n } from '../../../i18n';
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
      get title() {
        return i18n('analysis.tools.source');
      },
      icon: DatabaseIcon,
      render: (output) => <SourceTool source={output as SourceResult} />,
    },
  ],
  [
    'schema',
    {
      get title() {
        return i18n('analysis.tools.schema');
      },
      icon: Columns3Icon,
      render: (output) => <SchemaTool schema={output as Schema} />,
    },
  ],
  [
    'profile',
    {
      get title() {
        return i18n('analysis.tools.profile');
      },
      icon: ChartColumnIcon,
      render: (output) => <ProfileTool profile={output as Profile} />,
    },
  ],
  [
    'semantic',
    {
      get title() {
        return i18n('analysis.tools.semantic');
      },
      icon: TagsIcon,
      render: (output) => <SemanticTool semantic={output as Semantic} />,
    },
  ],
]);

export function ChatToolCall({
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
  useI18n();
  const name = getToolName(call);
  if (name === 'analyze') return <AnalyzeToolCall call={call} messageId={messageId} />;
  if (name === 'visualize') {
    return <VisualizeToolCall call={call} messageId={messageId} saved={saved} isStreaming={isStreaming} />;
  }

  const tool = dataTools.get(name);
  const errorText = getToolErrorText(call);
  const output =
    call.state === 'output-available' && call.output != null ? tool?.render(call.output) : undefined;
  const expandOn = tool ? (output || errorText ? 'click' : 'never') : 'running';

  return (
    <ToolCallView call={call} title={tool?.title ?? name} icon={tool?.icon} expandOn={expandOn}>
      <ToolOutput output={output} errorText={errorText} />
    </ToolCallView>
  );
}
