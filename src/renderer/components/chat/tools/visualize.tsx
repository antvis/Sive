import { i18n, useI18n } from '../../../i18n';
import { ChartLineIcon } from 'lucide-react';
import { useRef } from 'react';
import { toast } from 'sonner';
import type { SnippetContent } from '@shared/schema';
import { SnippetCard } from '../../SnippetCard';
import { getToolErrorText, ToolOutput } from '../../ai-elements/tool';
import type { ToolPart } from '../../ai-elements/tool';
import { ToolCallView } from '../tool-call';

function VisualizeTool({
  visualization,
  messageId,
  saved,
  isStreaming,
}: {
  visualization: SnippetContent;
  messageId: string;
  saved: boolean;
  isStreaming: boolean;
}) {
  useI18n();
  const savingRef = useRef(false);

  const save = async () => {
    if (savingRef.current || saved || isStreaming) return;
    savingRef.current = true;
    try {
      await window.workbench.snippetSave({ messageId, ...visualization });
      toast.success(i18n('snippet.notifications.saved'));
    } finally {
      savingRef.current = false;
    }
  };

  return <SnippetCard data={visualization} saved={saved} onSave={isStreaming ? undefined : save} />;
}

export function VisualizeToolCall({
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
  const errorText = getToolErrorText(call);
  const visualization = call.state === 'output-available' ? (call.output as SnippetContent | null) : null;
  const output =
    visualization?.spec && visualization.title ? (
      <VisualizeTool
        visualization={visualization}
        messageId={messageId}
        saved={saved}
        isStreaming={isStreaming}
      />
    ) : undefined;

  return (
    <ToolCallView
      call={call}
      title={i18n('analysis.tools.visualize')}
      icon={ChartLineIcon}
      expandOn={output || errorText ? 'completed' : 'never'}
    >
      <ToolOutput output={output} errorText={errorText} />
    </ToolCallView>
  );
}
