import { useState } from 'react';
import { ArchiveIcon, ArrowCounterClockwiseIcon, DatabaseIcon, TrashIcon } from '@phosphor-icons/react';
import type { State } from '../../shared/contracts';
import { Button, SearchInput, useUI } from './ui';
import { errorMessage } from '../shared/feedback';

export default function DeletedConversations({ state }: { state: State }) {
  const { confirm, message } = useUI();
  const [search, setSearch] = useState('');
  const [busy, setBusy] = useState(false);
  const deleted = state.deletedConversations;
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
        .sort((a, b) => b.deletedAt!.localeCompare(a.deletedAt!)),
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
      onOk: () => perform(() => window.workbench.purgeConversations(ids), '已永久删除'),
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
            <section
              className="mb-7 [&_>_header_strong]:flex-1 [&_>_header_strong]:min-w-0 [&_>_header_strong]:overflow-hidden [&_>_header_strong]:text-ellipsis [&_>_header_strong]:whitespace-nowrap [&_>_header_strong]:text-ink [&_>_header_strong]:text-body [&_>_header_strong]:font-medium [&_>_header_span]:text-helper [&_>_header_span]:whitespace-nowrap"
              key={dataset.id}
            >
              <header className="flex items-center gap-2.5 mb-3 text-muted">
                <DatabaseIcon />
                <strong title={dataset.name}>
                  {dataset.name}
                  {dataset.deletedAt ? ' · 连接已删除' : ''}
                </strong>
                <span>{conversations.length} 个分析会话</span>
              </header>
              <div className="px-4 border border-line rounded-[14px]">
                {conversations.map((conversation) => (
                  <div
                    className="deleted-row flex items-center gap-2.5 py-4 px-0 [&_+_.deleted-row]:border-t [&_+_.deleted-row]:border-t-[color-mix(in_srgb,_var(--border)_65%,_transparent)] [&_>_button]:shrink-0"
                    key={conversation.id}
                  >
                    <div className="flex-1 min-w-0">
                      <strong
                        className="block overflow-hidden text-ellipsis whitespace-nowrap text-body font-medium"
                        title={conversation.title}
                      >
                        {conversation.title}
                      </strong>
                      <time
                        className="block mt-[5px] text-helper text-muted"
                        dateTime={conversation.deletedAt}
                      >
                        归档于{' '}
                        {new Date(conversation.deletedAt!).toLocaleString('zh-CN', {
                          year: 'numeric',
                          month: '2-digit',
                          day: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </time>
                    </div>
                    <Button
                      variant="ghost"
                      size="small"
                      icon={<TrashIcon />}
                      aria-label={`永久删除：${conversation.title}`}
                      title="永久删除"
                      disabled={busy}
                      onClick={() => purge([conversation.id])}
                    />
                    <Button
                      size="small"
                      icon={<ArrowCounterClockwiseIcon />}
                      disabled={busy}
                      onClick={() =>
                        perform(() => window.workbench.restoreConversation(conversation.id), '会话已恢复')
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
