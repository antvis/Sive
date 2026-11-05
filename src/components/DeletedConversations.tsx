import { useState } from 'react';
import { ArchiveIcon, ArrowCounterClockwiseIcon, DatabaseIcon, TrashIcon } from '@phosphor-icons/react';
import type { State } from '../../shared/contracts';
import { Button, SearchInput, Select, useUI } from './ui';
import { errorMessage } from '../shared/feedback';

export default function DeletedConversations({ state }: { state: State }) {
  const { confirm, message } = useUI();
  const [search, setSearch] = useState('');
  const [source, setSource] = useState('all');
  const [busy, setBusy] = useState(false);
  const deleted = state.deletedConversations;
  const sources = state.datasets.filter((dataset) => deleted.some((c) => c.datasetId === dataset.id));
  const needle = search.trim().toLocaleLowerCase();
  const groups = sources
    .filter((dataset) => source === 'all' || dataset.id === source)
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
      title: ids.length === 1 ? '永久删除这个会话？' : `永久删除全部 ${ids.length} 个会话？`,
      content: '会话的分析结果、执行记录和收藏将一并删除，此操作无法恢复。数据源不受影响。',
      okText: '永久删除',
      okButtonProps: { danger: true },
      onOk: () => perform(() => window.workbench.purgeConversations(ids), '已永久删除'),
    });
  return (
    <section>
      <header className="flex items-start justify-between gap-5 mb-7 [&_>_button]:shrink-0">
        <div>
          <h2 className="mt-0 mr-0 mb-2 ml-0">已删除会话</h2>
          <p className="text-muted m-0 text-body">移除的会话保留在这里，恢复后可继续分析。</p>
        </div>
        <Button
          danger
          variant="ghost"
          icon={<TrashIcon />}
          disabled={busy || !deleted.length}
          onClick={() => purge(deleted.map((c) => c.id))}
        >
          全部删除
        </Button>
      </header>
      {deleted.length > 0 ? (
        <>
          <div className="deleted-filters grid grid-cols-[minmax(0,_1fr)_minmax(150px,_200px)] gap-3 mb-7">
            <SearchInput
              className="w-full"
              aria-label="搜索已删除会话"
              placeholder="搜索会话或数据源"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
            <Select
              aria-label="按数据源筛选"
              value={source}
              onChange={setSource}
              options={[
                { value: 'all', label: '所有数据源' },
                ...sources.map((d) => ({ value: d.id, label: d.name })),
              ]}
            />
          </div>
          {groups.map(({ dataset, conversations }) => (
            <section
              className="mb-7 [&_>_header_strong]:flex-1 [&_>_header_strong]:min-w-0 [&_>_header_strong]:overflow-hidden [&_>_header_strong]:text-ellipsis [&_>_header_strong]:whitespace-nowrap [&_>_header_strong]:text-ink [&_>_header_strong]:text-body [&_>_header_strong]:font-medium [&_>_header_span]:text-helper [&_>_header_span]:whitespace-nowrap"
              key={dataset.id}
            >
              <header className="flex items-center gap-2.5 mb-3 text-muted">
                <DatabaseIcon />
                <strong title={dataset.name}>{dataset.name}</strong>
                <span>{conversations.length} 个会话</span>
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
                        移除于{' '}
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
          <p className="text-ink mt-4 mr-0 mb-1.5 ml-0">暂无已删除会话</p>
          <span className="text-body">从左侧列表移除的会话会显示在这里。</span>
        </div>
      )}
    </section>
  );
}
