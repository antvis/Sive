import { useState } from 'react';
import { ArchiveIcon, ArrowCounterClockwiseIcon, DatabaseIcon, TrashIcon } from '@phosphor-icons/react';
import type { State } from '@shared/contracts';
import { Button, SearchInput } from '@renderer/components/ui/index';
import { useUI } from '@renderer/hooks/useUI';
import { errorMessage } from '@renderer/utils/feedback';

export default function DeletedConversations({ state }: { state: State }) {
  const { confirm, message } = useUI();
  const [search, setSearch] = useState('');
  const [busy, setBusy] = useState(false);
  const deleted = state.deletedConversations.flatMap((conversation) =>
    conversation.archivedAt ? [{ ...conversation, archivedAt: conversation.archivedAt }] : [],
  );
  const sources = state.datasets.filter((dataset) => deleted.some((c) => c.datasetId === dataset.id));
  const needle = search.trim().toLocaleLowerCase();
  const groups = sources
    .map((dataset) => ({
      dataset,
      conversations: deleted
        .filter(
          (c) =>
            c.datasetId === dataset.id && `${c.title} ${dataset.name}`.toLocaleLowerCase().includes(needle),
        )
        .sort((a, b) => b.archivedAt.localeCompare(a.archivedAt)),
    }))
    .filter((group) => group.conversations.length);

  const perform = async (action: () => Promise<void>, success: string) => {
    setBusy(true);
    try {
      await action();
      message.success(success);
    } catch (error) {
      message.error(errorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  const purge = (ids: string[]) =>
    confirm({
      title: ids.length === 1 ? '永久删除这个会话？' : `永久删除全部 ${ids.length} 个分析会话？`,
      content: '会话的分析结果、执行记录和收藏将一并删除，此操作无法恢复。数据源不受影响。',
      okText: '永久删除',
      okButtonProps: { danger: true },
      onOk: () => perform(() => window.workbench.conversationPurge(ids), '已永久删除'),
    });
  return (
    <section>
      {deleted.length > 0 ? (
        <>
          <div className="mb-7">
            <SearchInput
              className="max-w-75"
              aria-label="搜索分析会话或者数据源"
              placeholder="搜索分析会话或者数据源"
              allowClear
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
          {groups.map(({ dataset, conversations }) => (
            <section className="mb-7" key={dataset.id}>
              <header className="flex items-center gap-2.5 mb-3 text-muted">
                <DatabaseIcon />
                <strong
                  className="flex-1 min-w-0 truncate text-ink text-body font-medium"
                  title={dataset.name}
                >
                  {dataset.name}
                  {dataset.deletedAt ? ' · 连接已删除' : ''}
                </strong>
                <span className="text-helper whitespace-nowrap">{conversations.length} 个分析会话</span>
              </header>
              <div className="px-4 border border-line rounded-source">
                {conversations.map((conversation) => (
                  <div
                    className="flex items-center gap-2.5 py-4 border-t border-t-line/65 first:border-t-0"
                    key={conversation.id}
                  >
                    <div className="flex-1 min-w-0">
                      <strong className="block truncate text-body font-medium" title={conversation.title}>
                        {conversation.title}
                      </strong>
                      <time className="block mt-1 text-helper text-muted" dateTime={conversation.archivedAt}>
                        归档于{' '}
                        {new Date(conversation.archivedAt).toLocaleString('zh-CN', {
                          year: 'numeric',
                          month: '2-digit',
                          day: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </time>
                    </div>
                    <Button
                      className="shrink-0"
                      variant="ghost"
                      size="small"
                      icon={<TrashIcon />}
                      aria-label={`永久删除：${conversation.title}`}
                      title="永久删除"
                      disabled={busy}
                      onClick={() => purge([conversation.id])}
                    />
                    <Button
                      className="shrink-0"
                      size="small"
                      icon={<ArrowCounterClockwiseIcon />}
                      disabled={busy}
                      onClick={() =>
                        perform(() => window.workbench.conversationRestore(conversation.id), '会话已恢复')
                      }
                    >
                      恢复
                    </Button>
                  </div>
                ))}
              </div>
            </section>
          ))}
          {!groups.length && (
            <div className="grid justify-items-center py-16 px-4 text-muted text-center">
              <p className="text-ink mt-4 mr-0 mb-1.5 ml-0">没有匹配的会话</p>
              <span className="text-body">试试其他关键词或数据源。</span>
            </div>
          )}
        </>
      ) : (
        <div className="grid justify-items-center py-16 px-4 text-muted text-center">
          <ArchiveIcon size={28} />
          <p className="text-ink mt-4 mr-0 mb-1.5 ml-0">暂无已归档分析</p>
          <span className="text-body">从左侧列表归档的会话会显示在这里。</span>
        </div>
      )}
    </section>
  );
}
