import { BookmarkCheckIcon, BookmarkIcon } from 'lucide-react';
import { useRef, useState } from 'react';
import { toast } from 'sonner';
import type { SnippetContent } from '@shared/schema';
import { errorMessage } from '../../utils';
import { MessageAction, MessageActions } from '../ai-elements/message';
import { Badge } from '../ui/badge';
import { Summary } from '../Summary';
import { Visualization } from '../Visualization';

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
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);

  const save = async () => {
    if (saved || savingRef.current || isStreaming) return;
    savingRef.current = true;
    setSaving(true);
    try {
      await window.workbench.snippetSave({ messageId, ...visualization });
      toast.success('Snippet 已保存');
    } catch (cause) {
      toast.error(errorMessage(cause));
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };

  return (
    <div className="min-w-0 space-y-4 text-sm leading-6">
      <div className="flex flex-wrap gap-1.5">
        {[visualization.intent, ...visualization.tags].map((tag, index) => (
          <Badge key={`${tag}-${index}`} variant="secondary">
            {tag}
          </Badge>
        ))}
      </div>
      <div className="font-medium">
        <Summary syntax={visualization.title} />
      </div>
      <Summary syntax={visualization.summary} />
      <div className="flex flex-wrap gap-4">
        {visualization.metrics.map((metric, index) => (
          <div key={index} className="text-xs text-muted-foreground">
            {metric.label}
            <span className="ml-2 font-medium text-foreground">
              {metric.value} {metric.unit}
            </span>
          </div>
        ))}
      </div>
      <Visualization spec={visualization.spec} />
      <MessageActions>
        <MessageAction
          label={saved ? '已保存 Snippet' : '保存 Snippet'}
          aria-label={saved ? '已保存 Snippet' : '保存 Snippet'}
          disabled={saved || saving || isStreaming}
          onClick={() => void save()}
        >
          {saved ? <BookmarkCheckIcon className="size-3.5" /> : <BookmarkIcon className="size-3.5" />}
          {saving ? '保存中…' : saved ? '已保存' : '保存 Snippet'}
        </MessageAction>
      </MessageActions>
      <details className="text-xs text-muted-foreground">
        <summary className="cursor-pointer">分析来源</summary>
        <p className="mt-2">{visualization.question}</p>
      </details>
    </div>
  );
}
