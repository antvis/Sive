import { toast } from 'sonner';
import type { SnippetContent } from '@shared/schema';
import { SnippetCard } from '../../components/SnippetCard';

export type VisualizationResult = SnippetContent;

export function AnalysisChart({
  visualization,
  messageId,
  saved,
  isStreaming,
}: {
  visualization: VisualizationResult;
  messageId: string;
  saved: boolean;
  isStreaming: boolean;
}) {
  return (
    <div className="my-2 min-w-0">
      <SnippetCard
        data={visualization}
        saved={saved}
        onSave={
          isStreaming
            ? undefined
            : async () => {
                await window.workbench.snippetSave({ messageId, ...visualization });
                toast.success('Snippet 已保存');
              }
        }
      />
    </div>
  );
}
