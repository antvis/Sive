import { Lightbulb, PencilSimple, Trash } from '@phosphor-icons/react';
import { useState } from 'react';
import { toast } from 'sonner';
import type { Snippet } from '@shared/snippets';
import { Button } from '../../components/Button';
import { IconButton } from '../../components/IconButton';
import { Markdown } from '../../components/Markdown';
import { Modal } from '../../components/Modal';
import { Visualization } from '../../components/Visualization';
import { errorMessage } from '../../utils';
import { ExportButton } from '../../components/ExportButton';

function SnippetCard({ snippet, onDelete }: { snippet: Snippet; onDelete: () => void }) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(snippet.title);
  const [summary, setSummary] = useState(snippet.content.summary);
  const [busy, setBusy] = useState(false);

  const save = async () => {
    if (!title.trim() || busy) return;
    setBusy(true);
    try {
      await window.workbench.snippetUpdate(snippet.messageId, {
        title: title.trim(),
        summary: summary.trim(),
      });
      setEditing(false);
      toast.success('Snippet 已更新');
    } catch (cause) {
      toast.error(errorMessage(cause));
    } finally {
      setBusy(false);
    }
  };

  return (
    <article className="group min-w-0 break-inside-avoid rounded-xl bg-surface p-6 shadow-[0_2px_12px] shadow-ink/5 transition-shadow hover:shadow-[0_8px_24px] hover:shadow-ink/8">
      <div className="flex items-start justify-between gap-3">
        <span className="pt-1 text-[11px] font-medium tracking-[0.12em] text-muted">DATA INSIGHT</span>
        <div className="flex items-center gap-1">
          <time className="text-[11px] whitespace-nowrap text-muted">
            {new Date(snippet.createdAt).toLocaleString('zh-CN', {
              year: 'numeric',
              month: '2-digit',
              day: '2-digit',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </time>
          {!editing && (
            <div className="flex opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100 has-[[data-state=open]]:opacity-100 has-[:disabled]:opacity-100">
              <ExportButton target={{ kind: 'snippet', id: snippet.messageId }} />
              <IconButton
                icon={PencilSimple}
                label="编辑 Snippet"
                onClick={() => {
                  setTitle(snippet.title);
                  setSummary(snippet.content.summary);
                  setEditing(true);
                }}
              />
              <IconButton icon={Trash} label="删除 Snippet" variant="danger" onClick={onDelete} />
            </div>
          )}
        </div>
      </div>

      {editing ? (
        <input
          className="mt-4 w-full rounded-lg bg-page px-3 py-2 font-serif text-[22px] leading-8 font-medium outline-none"
          value={title}
          disabled={busy}
          autoFocus
          aria-label="Snippet 标题"
          onChange={(event) => setTitle(event.target.value)}
        />
      ) : (
        <h2 className="mt-4 mb-0 line-clamp-2 font-serif text-[22px] leading-8 font-medium text-ink">
          {snippet.title}
        </h2>
      )}

      {editing ? (
        <div className="mt-4">
          <textarea
            className="min-h-28 w-full resize-y rounded-lg bg-page p-3 text-sm leading-6 outline-none"
            value={summary}
            disabled={busy}
            aria-label="Snippet 洞察描述"
            onChange={(event) => setSummary(event.target.value)}
          />
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
        snippet.content.summary.trim() && (
          <div className="group/quote mt-4 grid grid-cols-[auto_minmax(0,1fr)_auto] items-end gap-2 px-2">
            <span
              aria-hidden
              className="self-start font-serif text-6xl leading-[0.75] text-accent/15 transition-[color,transform] duration-200 select-none group-hover/quote:-translate-y-0.5 group-hover/quote:text-accent/30 motion-reduce:transition-none"
            >
              “
            </span>
            <div className="min-w-0 text-sm leading-7 text-muted">
              <Markdown>{snippet.content.summary}</Markdown>
            </div>
            <span
              aria-hidden
              className="self-end translate-y-4 font-serif text-6xl leading-[0.5] text-accent/15 transition-[color,transform] duration-200 select-none group-hover/quote:translate-y-3 group-hover/quote:text-accent/30 motion-reduce:transition-none"
            >
              ”
            </span>
          </div>
        )
      )}

      <div className="group/chart relative mt-8 rounded-[2px] bg-surface p-3 shadow-[0_4px_16px_rgba(36,48,57,0.06)]">
        <span
          aria-hidden
          className="pointer-events-none absolute -top-3 left-1/2 h-5 w-20 -translate-x-1/2 -rotate-4 bg-[#e8dfc7]/70 shadow-[0_1px_3px_rgba(36,48,57,0.08)] transition-transform duration-200 select-none group-hover/chart:-translate-y-0.5 group-hover/chart:-rotate-1 motion-reduce:transition-none"
          style={{ clipPath: 'polygon(4% 0, 96% 0, 100% 50%, 96% 100%, 4% 100%, 0 50%)' }}
        />
        <Visualization spec={snippet.content.spec} height={360} />
      </div>
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

  const leftSnippets = snippets.filter((_, index) => index % 2 === 0);
  const rightSnippets = snippets.filter((_, index) => index % 2 === 1);

  return (
    <div className="w-full px-6 pt-8 pb-12">
      <header>
        <h1 className="m-0 text-[26px] leading-[1.35] font-semibold tracking-[-0.03em]">洞察 Snippet</h1>
        <p className="mt-2 mb-0 text-muted">{snippets.length} 个已保存的数据洞察</p>
      </header>

      {!snippets.length ? (
        <div className="mt-6 grid justify-items-center rounded-xl border border-dashed px-6 py-14 text-center">
          <Lightbulb size={32} className="text-muted" />
          <h2 className="mt-4 mb-2 text-base font-medium">暂无数据洞察</h2>
          <p className="m-0 text-muted">在分析图表中点击“保存 Snippet”后即可查看。</p>
        </div>
      ) : (
        <>
          <div className="mt-6 grid gap-5 xl:hidden">
            {snippets.map((snippet) => (
              <SnippetCard key={snippet.id} snippet={snippet} onDelete={() => setDeleting(snippet)} />
            ))}
          </div>
          <div className="mt-6 hidden gap-5 xl:grid xl:grid-cols-2">
            {[leftSnippets, rightSnippets].map((column, columnIndex) => (
              <div key={columnIndex} className="grid content-start gap-5">
                {column.map((snippet) => (
                  <SnippetCard key={snippet.id} snippet={snippet} onDelete={() => setDeleting(snippet)} />
                ))}
              </div>
            ))}
          </div>
        </>
      )}

      <Modal
        open={!!deleting}
        onOpenChange={(open) => !open && setDeleting(null)}
        title="删除 Snippet"
        footer={
          <>
            <Button disabled={busy} onClick={() => setDeleting(null)}>
              取消
            </Button>
            <Button variant="danger" disabled={busy} onClick={() => void remove()}>
              {busy ? '删除中…' : '删除'}
            </Button>
          </>
        }
      >
        <p className="m-0 leading-6 text-muted">确定删除“{deleting?.title}”吗？此操作无法撤销。</p>
      </Modal>
    </div>
  );
}
