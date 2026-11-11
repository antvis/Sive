import { Archive, ArrowCounterClockwise, Trash } from '@phosphor-icons/react';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '../../components/Button';
import { IconButton } from '../../components/IconButton';
import { Modal } from '../../components/Modal';
import type { Conversation, DatasetSummary } from '../../types';
import { errorMessage } from '../../utils';

type Props = { conversations: Conversation[]; datasets: DatasetSummary[] };

export function ArchivedConversations({ conversations, datasets }: Props) {
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
      <div className="grid justify-items-center rounded-xl border border-dashed px-6 py-14 text-center">
        <Archive size={32} className="text-muted" />
        <h3 className="mt-4 mb-2 text-base font-medium">暂无已归档分析</h3>
        <p className="m-0 text-muted">归档的会话会显示在这里。</p>
      </div>
    );
  }

  return (
    <section>
      <input
        className="mb-5 w-full max-w-80 rounded-lg border bg-surface px-3 py-2"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="搜索分析会话或者数据源"
      />
      {error && <p className="mt-0 text-xs text-danger">{error}</p>}
      <div className="grid gap-5">
        {[...groups].map(([datasetId, items]) => (
          <section key={datasetId}>
            <h3 className="mt-0 mb-2 text-sm font-medium">
              {sourceName(datasetId)}
              <span className="ml-2 text-xs font-normal text-muted">{items.length} 个分析会话</span>
            </h3>
            <div className="rounded-xl border px-4">
              {items.map((conversation) => (
                <div key={conversation.id} className="flex items-center gap-3 border-t py-4 first:border-t-0">
                  <div className="min-w-0 flex-1">
                    <strong className="block truncate text-sm font-medium">{conversation.title}</strong>
                    <time className="mt-1 block text-xs text-muted">
                      归档于 {new Date(conversation.archivedAt!).toLocaleString('zh-CN')}
                    </time>
                  </div>
                  <IconButton
                    icon={Trash}
                    label={`永久删除 ${conversation.title}`}
                    disabled={busy}
                    onClick={() => setDeleting(conversation)}
                  />
                  <Button
                    disabled={busy}
                    onClick={() =>
                      void perform(() => window.workbench.conversationRestore(conversation.id), '会话已恢复')
                    }
                  >
                    <ArrowCounterClockwise size={15} />
                    恢复
                  </Button>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
      {!groups.size && (
        <p className="py-12 text-center text-muted">没有匹配的会话，试试其他关键词或数据源。</p>
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
                  setDeleting(null);
                }, '已永久删除')
              }
            >
              永久删除
            </Button>
          </>
        }
      >
        <p className="m-0 leading-6 text-muted">
          会话的分析结果和收藏将一并删除，数据源不受影响。此操作无法恢复。
        </p>
      </Modal>
    </section>
  );
}
