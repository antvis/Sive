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
    <section className="deleted-conversations">
      <header className="deleted-header">
        <div>
          <h2>已删除会话</h2>
          <p className="text-muted">移除的会话保留在这里，恢复后可继续分析。</p>
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
          <div className="deleted-filters">
            <SearchInput
              aria-label="搜索已删除会话"
              placeholder="搜索会话或数据源"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              style={{ width: '100%' }}
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
            <section className="deleted-group" key={dataset.id}>
              <header>
                <DatabaseIcon />
                <strong title={dataset.name}>{dataset.name}</strong>
                <span>{conversations.length} 个会话</span>
              </header>
              <div className="deleted-list">
                {conversations.map((conversation) => (
                  <div className="deleted-row" key={conversation.id}>
                    <div className="deleted-row-content">
                      <strong title={conversation.title}>{conversation.title}</strong>
                      <time dateTime={conversation.deletedAt}>
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
            <div className="deleted-empty">
              <p>没有匹配的会话</p>
              <span>试试其他关键词或数据源。</span>
            </div>
          )}
        </>
      ) : (
        <div className="deleted-empty">
          <ArchiveIcon size={28} />
          <p>暂无已删除会话</p>
          <span>从左侧列表移除的会话会显示在这里。</span>
        </div>
      )}
    </section>
  );
}
