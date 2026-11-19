import { CalendarBlank, CaretDown, Lightbulb, LinkSimple, PencilSimple, Trash } from '@phosphor-icons/react';
import { AlertDialog } from 'radix-ui';
import { useId, useState } from 'react';
import { toast } from 'sonner';
import type { Snippet } from '@shared/schema';
import { Button } from '../../components/Button';
import { IconButton } from '../../components/IconButton';
import { HighlightedTitle, InsightLabels, InsightNote, InsightFigure } from '../../components/InsightCard';
import { errorMessage } from '../../utils';

function SnippetCard({ snippet, onDelete }: { snippet: Snippet; onDelete: () => void }) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(snippet.title);
  const [summary, setSummary] = useState(snippet.content.summary);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const titleId = useId();
  const spec = snippet.content.spec;
  const subtitle = typeof spec !== 'string' ? spec.subtitle : undefined;
  const presentation = snippet.content.presentation;

  const save = async () => {
    if (!title.trim() || busy) return;
    setBusy(true);
    setError('');
    try {
      await window.workbench.snippetUpdate(snippet.messageId, {
        title: title.trim(),
        summary: summary.trim(),
      });
      setEditing(false);
      toast.success('Snippet 已更新');
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setBusy(false);
    }
  };

  return (
    <article
      aria-labelledby={titleId}
      className="group/snippet relative isolate mb-7 inline-block h-fit w-full min-w-0 break-inside-avoid rounded-xl border border-[color-mix(in_srgb,var(--line)_85%,var(--surface))]! bg-surface bg-[linear-gradient(160deg,color-mix(in_srgb,var(--accent-soft)_20%,var(--surface)),var(--surface)_40%)] p-6 text-ink shadow-[0_3px_0_-1px_var(--surface),0_3px_0_var(--line),0_5px_8px_-5px_color-mix(in_srgb,var(--ink)_12%,transparent),0_18px_30px_-22px_color-mix(in_srgb,var(--ink)_28%,transparent)] before:pointer-events-none before:absolute before:inset-0 before:-z-10 before:rounded-[inherit] before:bg-[url('/textures/paper-grain.svg')] before:opacity-[0.055]"
    >
      <span
        aria-hidden
        className="pointer-events-none absolute -top-2.5 left-[calc(50%-42px)] h-[22px] w-[84px] -rotate-3 [border-inline:1px_dashed_color-mix(in_srgb,var(--accent)_22%,transparent)]! bg-[linear-gradient(110deg,color-mix(in_srgb,var(--accent-soft)_85%,transparent),color-mix(in_srgb,var(--accent)_20%,var(--accent-soft)))] shadow-[0_1px_2px_color-mix(in_srgb,var(--ink)_7%,transparent)] [clip-path:polygon(2%_0,98%_0,100%_18%,98%_34%,100%_54%,98%_75%,100%_100%,0_100%,2%_78%,0_57%,2%_36%,0_16%)] after:absolute after:inset-0 after:bg-[url('/textures/paper-grain.svg')] after:opacity-12 after:mix-blend-multiply"
      />
      <header className="flex min-h-8 items-center justify-between gap-3">
        <InsightLabels presentation={presentation} />
        <div className="flex items-center gap-1 [@media(hover:hover)_and_(pointer:fine)]:opacity-0 [@media(hover:hover)_and_(pointer:fine)]:group-focus-within/snippet:opacity-100 [@media(hover:hover)_and_(pointer:fine)]:group-hover/snippet:opacity-100">
          {!editing && (
            <div className="flex">
              <IconButton
                icon={PencilSimple}
                label="编辑 Snippet"
                onClick={() => {
                  setTitle(snippet.title);
                  setSummary(snippet.content.summary);
                  setError('');
                  setEditing(true);
                }}
              />
              <IconButton
                icon={Trash}
                label="删除 Snippet"
                className="hover:text-danger"
                onClick={onDelete}
              />
            </div>
          )}
        </div>
      </header>

      {editing ? (
        <input
          id={titleId}
          className="mt-4 w-full rounded-lg border bg-surface px-3 py-2 text-xl leading-7 font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          value={title}
          disabled={busy}
          autoFocus
          aria-label="Snippet 标题"
          onChange={(event) => setTitle(event.target.value)}
        />
      ) : (
        <h2
          id={titleId}
          className="mt-3 mb-0 line-clamp-2 text-xl leading-7 font-semibold break-words text-balance"
          title={snippet.title}
        >
          <HighlightedTitle text={snippet.title} highlights={presentation?.titleHighlights ?? []} />
        </h2>
      )}
      {!editing && subtitle && (
        <p
          className="mt-2 mb-0 line-clamp-2 max-w-[65ch] text-xs leading-5 text-pretty text-muted"
          title={subtitle}
        >
          {subtitle}
        </p>
      )}

      {editing ? (
        <div className="mt-4">
          <textarea
            className="min-h-28 w-full resize-y rounded-lg border bg-surface p-3 text-sm leading-6 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            value={summary}
            disabled={busy}
            aria-label="Snippet 洞察描述"
            onChange={(event) => setSummary(event.target.value)}
          />
          {error && (
            <p role="alert" className="mt-2 mb-0 text-sm text-danger">
              {error}
            </p>
          )}
          <div className="mt-3 flex justify-end gap-2">
            <Button disabled={busy} onClick={() => setEditing(false)}>
              取消
            </Button>
            <Button variant="primary" disabled={busy || !title.trim()} onClick={() => void save()}>
              {busy ? '保存中…' : '保存'}
            </Button>
          </div>
        </div>
      ) : (
        <InsightNote text={snippet.content.summary} syntax={presentation?.summaryT8} />
      )}

      <InsightFigure spec={spec} />
      <footer className="mt-3 flex items-start justify-between gap-4 border-t border-line/65! pt-3 text-xs text-muted">
        <details className="group/source min-w-0 flex-1">
          <summary className="flex w-fit cursor-pointer list-none items-center gap-1.5 rounded-sm leading-6 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent [&::-webkit-details-marker]:hidden">
            <LinkSimple size={13} aria-hidden />
            分析来源
            <CaretDown size={11} aria-hidden className="group-open/source:rotate-180" />
          </summary>
          <p className="mt-2 mb-0 leading-5 text-pretty wrap-anywhere">{snippet.content.question}</p>
        </details>
        <time
          dateTime={snippet.createdAt}
          title={`保存于 ${new Date(snippet.createdAt).toLocaleString('zh-CN')}`}
          className="flex shrink-0 items-center gap-1.5 leading-6 tabular-nums"
        >
          <CalendarBlank size={13} aria-hidden />
          {new Date(snippet.createdAt).toLocaleDateString('zh-CN', {
            month: 'short',
            day: 'numeric',
          })}
        </time>
      </footer>
    </article>
  );
}

export function SnippetsPage({ snippets }: { snippets: Snippet[] }) {
  const [deleting, setDeleting] = useState<Snippet | null>(null);
  const [busy, setBusy] = useState(false);

  const remove = async () => {
    if (!deleting || busy) return;
    setBusy(true);
    try {
      await window.workbench.snippetRemove(deleting.messageId);
      setDeleting(null);
      toast.success('Snippet 已删除');
    } catch (cause) {
      toast.error(errorMessage(cause));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="w-full px-6 pt-8 pb-12">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="m-0 text-[26px] leading-[1.35] font-semibold text-balance">洞察 Snippet</h1>
          <p className="mt-2 mb-0 text-pretty text-muted">
            <span className="tabular-nums">{snippets.length}</span> 个已保存的数据洞察 · 把发现收集起来
          </p>
        </div>
      </header>

      {!snippets.length ? (
        <div className="mt-6 grid justify-items-center rounded-xl border border-dashed px-6 py-14 text-center">
          <Lightbulb size={32} className="text-muted" />
          <h2 className="mt-4 mb-2 text-base font-medium">暂无数据洞察</h2>
          <p className="m-0 text-muted">在分析图表中点击“保存 Snippet”后即可查看。</p>
        </div>
      ) : (
        <div className="mt-8 columns-1 gap-7 xl:columns-2">
          {snippets.map((snippet) => (
            <SnippetCard key={snippet.id} snippet={snippet} onDelete={() => setDeleting(snippet)} />
          ))}
        </div>
      )}

      <AlertDialog.Root open={!!deleting} onOpenChange={(open) => !busy && !open && setDeleting(null)}>
        <AlertDialog.Portal>
          <AlertDialog.Overlay className="fixed inset-0 z-50 bg-[#15202bcc]" />
          <AlertDialog.Content className="fixed top-1/2 left-1/2 z-50 w-[480px] max-w-[calc(100vw-32px)] -translate-x-1/2 -translate-y-1/2 rounded-2xl border bg-surface p-6 shadow-2xl">
            <AlertDialog.Title className="mt-0 mb-4 text-lg font-semibold text-balance">
              删除 Snippet
            </AlertDialog.Title>
            <AlertDialog.Description className="m-0 text-sm leading-6 text-pretty text-muted">
              确定删除“{deleting?.title}”吗？此操作无法撤销。
            </AlertDialog.Description>
            <div className="mt-6 flex justify-end gap-2">
              <AlertDialog.Cancel asChild>
                <Button disabled={busy}>取消</Button>
              </AlertDialog.Cancel>
              <Button variant="danger" disabled={busy} onClick={() => void remove()}>
                {busy ? '删除中…' : '删除'}
              </Button>
            </div>
          </AlertDialog.Content>
        </AlertDialog.Portal>
      </AlertDialog.Root>
    </div>
  );
}
