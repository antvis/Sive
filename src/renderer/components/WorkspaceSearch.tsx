import { ChatCircle, Database } from '@phosphor-icons/react';
import clsx from 'clsx';
import { useEffect, useId, useRef, useState } from 'react';
import type { Conversation, DatasetSummary } from '../types';
import { Modal } from './Modal';

export function WorkspaceSearch({
  datasets,
  conversations,
  onClose,
  onDatasetSelect,
  onConversationSelect,
}: {
  datasets: DatasetSummary[];
  conversations: Conversation[];
  onClose: () => void;
  onDatasetSelect: (id: string) => void;
  onConversationSelect: (id: string) => void;
}) {
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(0);
  const listId = useId();
  const listRef = useRef<HTMLDivElement>(null);
  const names = new Map(datasets.map((dataset) => [dataset.id, dataset.name]));
  const search = query.trim().toLocaleLowerCase();
  const results = [
    ...datasets.map((dataset) => ({
      id: dataset.id,
      kind: 'dataset',
      title: dataset.name,
      description: '数据源',
      updatedAt: dataset.updatedAt,
    })),
    ...conversations
      .filter((conversation) => names.has(conversation.datasetId))
      .map((conversation) => ({
        id: conversation.id,
        kind: 'conversation',
        title: conversation.title,
        description: names.get(conversation.datasetId)!,
        updatedAt: conversation.updatedAt,
      })),
  ]
    .filter((item) => `${item.title} ${item.description}`.toLocaleLowerCase().includes(search))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  const visible = results.slice(0, 30);
  const active = Math.min(selected, visible.length - 1);

  const select = (index: number) => {
    const item = visible[index];
    if (!item) return;
    if (item.kind === 'dataset') onDatasetSelect(item.id);
    else onConversationSelect(item.id);
    onClose();
  };

  useEffect(() => {
    listRef.current?.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: 'nearest' });
  }, [active, query]);

  return (
    <Modal
      open
      title="搜索数据源和会话"
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <input
        autoFocus
        role="combobox"
        aria-label="搜索数据源和会话"
        aria-expanded
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined}
        placeholder="输入数据源或会话名称"
        value={query}
        onChange={(event) => {
          setQuery(event.target.value);
          setSelected(0);
        }}
        onKeyDown={(event) => {
          if (event.nativeEvent.isComposing || event.keyCode === 229) return;
          if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            event.preventDefault();
            if (visible.length)
              setSelected((active + (event.key === 'ArrowDown' ? 1 : -1) + visible.length) % visible.length);
          } else if (event.key === 'Enter') {
            event.preventDefault();
            select(active);
          }
        }}
        className="mb-3 w-full rounded-lg border bg-page px-3 py-2 text-sm outline-none focus:border-accent"
      />
      <div ref={listRef} id={listId} role="listbox" aria-label="搜索结果" className="max-h-80 overflow-auto">
        {visible.map((item, index) => {
          const Icon = item.kind === 'dataset' ? Database : ChatCircle;
          return (
            <button
              key={`${item.kind}:${item.id}`}
              id={`${listId}-${index}`}
              type="button"
              role="option"
              aria-selected={index === active}
              className={clsx(
                'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left',
                index === active ? 'bg-accent-soft text-accent' : 'hover:bg-page',
              )}
              onClick={() => select(index)}
            >
              <Icon size={18} className="shrink-0" aria-hidden />
              <span className="min-w-0">
                <span className="block truncate text-sm">{item.title}</span>
                <span className="block truncate text-xs text-muted">{item.description}</span>
              </span>
            </button>
          );
        })}
      </div>
      {!results.length && (
        <p role="status" className="text-sm text-muted">
          没有匹配的数据源或会话
        </p>
      )}
      <p className="mb-0 mt-3 text-xs text-muted">
        {results.length > 30 ? '显示前 30 项，请输入更具体的名称。' : '↑ ↓ 选择，Enter 打开，Esc 关闭'}
      </p>
    </Modal>
  );
}
