import { ArchiveIcon, RotateCcwIcon, Trash2Icon } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '../../components/ui/button';
import { Modal } from '../../components/ui/dialog';
import { clearConversationUnread } from '../../hooks/useConversationStatus';
import type { Conversation, DatasetSummary } from '../../types';
import { errorMessage } from '../../utils';
import { Input } from '../../components/ui/input';

type Props = {
  conversations: Conversation[];
  datasets: DatasetSummary[];
  runningConversationIds: string[];
};

export function ArchivedConversations({ conversations, datasets, runningConversationIds }: Props) {
  const [query, setQuery] = useState('');
  const [deleting, setDeleting] = useState<Conversation | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const sourceName = (id: string) => datasets.find((dataset) => dataset.id === id)?.name ?? '数据源已删除';
  const needle = query.trim().toLocaleLowerCase();
  const filtered = conversations.filter((conversation) =>
    `${conversation.title} ${sourceName(conversation.datasetId)}`.toLocaleLowerCase().includes(needle),
  );
  const groups = new Map<string, Conversation[]>();
  for (const conversation of filtered) {
    groups.set(conversation.datasetId, [...(groups.get(conversation.datasetId) ?? []), conversation]);
  }

  const perform = async (action: () => Promise<void>, success: string) => {
    setBusy(true);
    setError('');
    try {
      await action();
      toast.success(success);
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setBusy(false);
    }
  };

  if (!conversations.length) {
    return (
      <div className="grid justify-items-center px-6 py-14 text-center">
        <ArchiveIcon size={32} className="text-muted-foreground" />
        <h2 className="mt-4 mb-2 text-base font-medium">暂无归档会话</h2>
        <p className="m-0 text-muted-foreground">在侧栏归档的分析会话可以在这里恢复或永久删除</p>
      </div>
    );
  }

  return (
    <section>
      <Input
        type="search"
        aria-label="搜索归档会话"
        className="mb-5 max-w-80"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="搜索会话标题或数据源"
      />
      {error && <p className="mt-0 text-sm text-danger">{error}</p>}
      <div className="grid grid-cols-1 gap-5">
        {[...groups].map(([datasetId, items]) => (
          <section key={datasetId}>
            <h2 className="mt-0 mb-2 text-base font-medium">
              {sourceName(datasetId)}
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                {items.length} 个分析会话
              </span>
            </h2>
            <div className="rounded-xl bg-workspace-control/70 px-4">
              {items.map((conversation) => (
                <div key={conversation.id} className="flex items-center gap-3 py-3">
                  <div className="min-w-0 flex-1">
                    <strong
                      className="block truncate text-base font-medium [-webkit-app-region:no-drag]"
                      title={conversation.title}
                    >
                      {conversation.title}
                    </strong>
                    <time className="mt-1 block text-xs text-muted-foreground">
                      归档于 {new Date(conversation.archivedAt!).toLocaleString('zh-CN')}
                    </time>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={
                      runningConversationIds.includes(conversation.id)
                        ? '分析仍在运行，请先恢复会话并停止任务'
                        : `永久删除 ${conversation.title}`
                    }
                    title={
                      runningConversationIds.includes(conversation.id)
                        ? '分析仍在运行，请先恢复会话并停止任务'
                        : `永久删除 ${conversation.title}`
                    }
                    disabled={busy || runningConversationIds.includes(conversation.id)}
                    onClick={() => setDeleting(conversation)}
                  >
                    <Trash2Icon className="size-[16px]" aria-hidden />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`恢复 ${conversation.title}`}
                    title={`恢复 ${conversation.title}`}
                    disabled={busy}
                    onClick={() =>
                      void perform(() => window.workbench.conversationRestore(conversation.id), '会话已恢复')
                    }
                  >
                    <RotateCcwIcon className="size-[16px]" aria-hidden />
                  </Button>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
      {!groups.size && (
        <p className="py-12 text-center text-sm text-muted-foreground">
          没有匹配的会话，试试其他关键词或数据源
        </p>
      )}
      <Modal
        open={!!deleting}
        onOpenChange={(open) => !open && setDeleting(null)}
        title="永久删除分析会话"
        footer={
          <>
            <Button onClick={() => setDeleting(null)}>取消</Button>
            <Button
              variant="danger"
              disabled={busy}
              onClick={() =>
                void perform(async () => {
                  await window.workbench.conversationPurge([deleting!.id]);
                  clearConversationUnread(deleting!.id);
                  setDeleting(null);
                }, '已永久删除')
              }
            >
              永久删除
            </Button>
          </>
        }
      >
        <p className="m-0 leading-6 text-muted-foreground">
          会话的分析结果和收藏将一并删除，数据源不受影响。此操作无法恢复
        </p>
      </Modal>
    </section>
  );
}
