import { Lightbulb, PushPin } from '@phosphor-icons/react';
import { useId, useState } from 'react';
import { toast } from 'sonner';
import type { SnippetContent } from '@shared/schema';
import { IconButton } from '../../components/IconButton';
import { errorMessage } from '../../utils';
import { HighlightedTitle, InsightFigure, InsightLabels, InsightNote } from '../../components/InsightCard';

export type VisualizationResult = Partial<SnippetContent>;

export function AnalysisChart({
  visualization,
  messageId,
  saved,
}: {
  visualization: VisualizationResult;
  messageId: string;
  saved: boolean;
}) {
  const titleId = useId();
  const insightId = useId();
  const [insightOpen, setInsightOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const { spec, question, summary, presentation } = visualization;
  const title = (typeof spec !== 'string' && spec?.title) || visualization.question || '数据分析';
  const subtitle = typeof spec !== 'string' ? spec?.subtitle : undefined;
  const canSave = Boolean(question && spec && typeof summary === 'string');

  const save = async () => {
    if (!question || !spec || typeof summary !== 'string' || saved || saving) return;
    setSaving(true);
    setError('');
    try {
      await window.workbench.snippetSave({
        messageId,
        question,
        spec,
        summary,
        presentation,
      });
      toast.success('Snippet 已保存');
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setSaving(false);
    }
  };

  return (
    <article
      aria-labelledby={titleId}
      className="relative isolate my-2 min-w-0 rounded-xl border border-[color-mix(in_srgb,var(--line)_85%,var(--surface))]! bg-surface p-5 text-ink shadow-[0_2px_5px_color-mix(in_srgb,var(--ink)_4%,transparent)] before:pointer-events-none before:absolute before:inset-0 before:-z-10 before:rounded-[inherit] before:bg-[url('/textures/paper-grain.svg')] before:opacity-[0.035]"
    >
      <header className="flex items-start justify-between gap-3">
        <InsightLabels presentation={presentation} />
        <div className="flex shrink-0 items-center gap-1">
          {summary?.trim() && (
            <IconButton
              icon={Lightbulb}
              weight={insightOpen ? 'fill' : 'regular'}
              label={insightOpen ? '收起洞察' : '查看洞察'}
              aria-expanded={insightOpen}
              aria-controls={insightId}
              iconClassName={insightOpen ? 'text-accent' : undefined}
              onClick={() => setInsightOpen((open) => !open)}
            />
          )}
          {canSave && (
            <IconButton
              icon={PushPin}
              weight={saved ? 'fill' : 'regular'}
              label={saved ? '已保存 Snippet' : saving ? '保存中…' : '保存 Snippet'}
              disabled={saved || saving}
              className={saved ? 'text-accent disabled:opacity-100' : undefined}
              onClick={() => void save()}
            />
          )}
        </div>
      </header>
      <h3
        id={titleId}
        className="mt-3 mb-0 line-clamp-2 text-lg leading-7 font-semibold break-words text-balance"
        title={title}
      >
        <HighlightedTitle text={title} highlights={presentation?.titleHighlights ?? []} />
      </h3>
      {subtitle && (
        <p
          className="mt-2 mb-0 line-clamp-2 max-w-[65ch] text-xs leading-5 text-pretty text-muted"
          title={subtitle}
        >
          {subtitle}
        </p>
      )}
      <div id={insightId} hidden={!insightOpen}>
        {insightOpen && <InsightNote text={summary ?? ''} syntax={presentation?.summaryT8} />}
      </div>
      {spec && <InsightFigure spec={spec} />}
      {error && (
        <p role="alert" className="mt-3 mb-0 text-sm text-danger">
          {error}
        </p>
      )}
    </article>
  );
}
