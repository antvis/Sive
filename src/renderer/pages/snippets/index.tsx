import { LightbulbIcon } from 'lucide-react';
import { AlertDialog } from 'radix-ui';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import type { Snippet } from '@shared/schema';
import { Button } from '../../components/Button';
import { SnippetCard } from '../../components/SnippetCard';
import { errorMessage } from '../../utils';

export function SnippetsPage({ snippets }: { snippets: Snippet[] }) {
  const [deleting, setDeleting] = useState<Snippet | null>(null);
  const [busy, setBusy] = useState(false);
  const [columnCount, setColumnCount] = useState(() =>
    window.matchMedia('(min-width: 1280px)').matches ? 2 : 1,
  );

  useEffect(() => {
    const media = window.matchMedia('(min-width: 1280px)');

    const update = () => setColumnCount(media.matches ? 2 : 1);

    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);

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
          <h1 className="m-0 text-3xl leading-[1.35] font-semibold text-balance">洞察 Snippet</h1>
          <p className="mt-2 mb-0 text-pretty text-muted-foreground">
            <span className="tabular-nums">{snippets.length}</span> 个已保存的数据洞察 · 把发现收集起来
          </p>
        </div>
      </header>

      {!snippets.length ? (
        <div className="mt-6 grid justify-items-center rounded-xl border border-dashed px-6 py-14 text-center">
          <LightbulbIcon size={32} className="text-muted-foreground" />
          <h2 className="mt-4 mb-2 text-base font-medium">暂无数据洞察</h2>
          <p className="m-0 text-muted-foreground">在分析图表中点击“保存 Snippet”后即可查看。</p>
        </div>
      ) : (
        <div className="mt-8 grid grid-cols-1 items-start gap-7 xl:grid-cols-2">
          {Array.from({ length: columnCount }, (_, column) => (
            <div key={column} className="flex min-w-0 flex-col gap-7">
              {snippets.map((snippet, index) =>
                index % columnCount === column ? (
                  <div key={snippet.id} className="min-w-0">
                    <SnippetCard
                      data={snippet}
                      templateId={snippet.templateId}
                      createdAt={snippet.createdAt}
                      onUpdate={async (input) => {
                        await window.workbench.snippetUpdate(snippet.messageId, input);
                        toast.success('Snippet 已更新');
                      }}
                      onDelete={() => setDeleting(snippet)}
                    />
                  </div>
                ) : null,
              )}
            </div>
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
            <AlertDialog.Description className="m-0 text-sm leading-6 text-pretty text-muted-foreground">
              确定删除这个 Snippet 吗？此操作无法撤销。
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
