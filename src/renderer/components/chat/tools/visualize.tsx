import { useRef } from 'react';
import { toast } from 'sonner';
import type { SnippetContent } from '@shared/schema';
import { SnippetCard } from '../../SnippetCard';

export function VisualizeTool({
  visualization,
  messageId,
  saved,
  isStreaming,
}: {
  visualization: SnippetContent | null | undefined;
  messageId: string;
  saved: boolean;
  isStreaming: boolean;
}) {
  const savingRef = useRef(false);

  if (!visualization?.spec || !visualization.title) {
    return <p className="m-0 text-sm leading-6 text-muted-foreground">未生成图表。</p>;
  }

  const save = async () => {
    if (savingRef.current || saved || isStreaming) return;
    savingRef.current = true;
    try {
      await window.workbench.snippetSave({ messageId, ...visualization });
      toast.success('Snippet 已保存');
    } finally {
      savingRef.current = false;
    }
  };

  return <SnippetCard data={visualization} saved={saved} onSave={isStreaming ? undefined : save} />;
}
