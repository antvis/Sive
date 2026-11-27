import { LightbulbIcon } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import type { Snippet } from '@shared/schema';
import { SnippetCard } from '../../components/SnippetCard';
import { ShareDialog } from '../../components/SnippetCard/ShareDialog';
import { WorkspacePage } from '../../components/WorkspacePage';
import { Button } from '../../components/ui/button';
import { AlertDialog } from '../../components/ui/dialog';
import { cn } from '../../lib/utils';
import { errorMessage } from '../../utils';

export function SnippetsPage({ snippets }: { snippets: Snippet[] }) {
  const [deleting, setDeleting] = useState<Snippet | null>(null);
  const [sharing, setSharing] = useState<Snippet | null>(null);
  const [busy, setBusy] = useState(false);
  const [columnCount, setColumnCount] = useState(() =>
    window.matchMedia('(min-width: 1280px)').matches ? 2 : 1,
  );
  const visibleColumns = Math.min(columnCount, snippets.length);

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
    <WorkspacePage
      title="洞察 Snippet"
      description={<><span className="tabular-nums">{snippets.length}</span> 个已保存的数据洞察</>}
    >
      {!snippets.length ? (
        <div className="mt-10 grid justify-items-center rounded-2xl bg-page px-6 py-14 text-center">
          <div className="grid size-12 place-items-center rounded-xl bg-workspace-control text-ink">
            <LightbulbIcon size={23} aria-hidden />
          </div>
          <h2 className="mt-4 mb-2 text-base font-medium">暂无数据洞察</h2>
          <p className="m-0 text-muted-foreground">在分析图表中点击“保存 Snippet”后即可查看。</p>
        </div>
      ) : (
        <div
          className={cn(
            'mt-10 grid grid-cols-1 items-start gap-6 **:scrollbar-none',
            visibleColumns > 1 && 'grid-cols-2',
          )}
        >
          {Array.from({ length: visibleColumns }, (_, column) => (
            <div key={column} className="flex min-w-0 flex-col gap-7">
              {snippets.map((snippet, index) =>
                index % visibleColumns === column ? (
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
                      onShare={() => setSharing(snippet)}
                    />
                  </div>
                ) : null,
              )}
            </div>
          ))}
        </div>
      )}

      {sharing && <ShareDialog snippet={sharing} onClose={() => setSharing(null)} />}

      <AlertDialog
        open={!!deleting}
        onOpenChange={(open) => !busy && !open && setDeleting(null)}
        title="删除 Snippet"
        description="确定删除这个 Snippet 吗？此操作无法撤销。"
        cancel={
          <Button disabled={busy}>
            取消
          </Button>
        }
      >
        <Button variant="danger" disabled={busy} onClick={() => void remove()}>
          {busy ? '删除中…' : '删除'}
        </Button>
      </AlertDialog>
    </WorkspacePage>
  );
}
