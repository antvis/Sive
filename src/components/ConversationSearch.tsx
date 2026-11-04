import { useEffect, useRef, useState } from 'react';
import { MagnifyingGlassIcon } from '@phosphor-icons/react';
import type { Conversation, Dataset } from '../../shared/contracts';
import { Button, Input, Modal, Tooltip } from './ui';

export default function ConversationSearch({
  conversations,
  datasets,
  disabled,
  onSelect,
}: {
  conversations: Conversation[];
  datasets: Dataset[];
  disabled: boolean;
  onSelect: (conversation: Conversation) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const input = useRef<HTMLInputElement>(null);
  const shortcut = navigator.platform.includes('Mac') ? '⌘K' : 'Ctrl+K';
  const show = () => {
    setQuery('');
    setOpen(true);
  };
  useEffect(() => {
    const keydown = (event: KeyboardEvent) => {
      if (
        (event.metaKey || event.ctrlKey) &&
        !event.altKey &&
        !event.shiftKey &&
        event.key.toLowerCase() === 'k'
      ) {
        event.preventDefault();
        if (!event.repeat) show();
      }
    };
    window.addEventListener('keydown', keydown);
    return () => window.removeEventListener('keydown', keydown);
  }, []);
  useEffect(() => {
    if (open) input.current?.focus();
  }, [open]);
  const names = new Map(datasets.map((dataset) => [dataset.id, dataset.name]));
  const needle = query.trim().toLocaleLowerCase();
  const results = conversations
    .filter(
      (conversation) =>
        names.has(conversation.datasetId) &&
        `${conversation.title} ${names.get(conversation.datasetId)}`.toLocaleLowerCase().includes(needle),
    )
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  const select = (conversation: Conversation) => {
    onSelect(conversation);
    setOpen(false);
  };
  return (
    <>
      <span className="conversation-search-trigger">
        <Tooltip
          title={
            <span className="search-shortcut-label">
              搜索会话 <kbd>{shortcut}</kbd>
            </span>
          }
        >
          <Button
            variant="ghost"
            icon={<MagnifyingGlassIcon />}
            aria-label={`搜索所有会话 (${shortcut})`}
            aria-keyshortcuts="Meta+K Control+K"
            onClick={show}
          />
        </Tooltip>
      </span>
      <Modal
        title={
          <span className="search-shortcut-label">
            搜索会话 <kbd>{shortcut}</kbd>
          </span>
        }
        open={open}
        onCancel={() => setOpen(false)}
        footer={null}
        width={600}
      >
        <Input
          ref={input}
          autoFocus
          aria-label="搜索所有会话"
          placeholder="搜索会话标题或数据源名称"
          prefix={<MagnifyingGlassIcon />}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.nativeEvent.isComposing && results[0] && !disabled)
              select(results[0]);
          }}
        />
        <div className="conversation-search-results">
          {results.map((conversation) => (
            <button key={conversation.id} disabled={disabled} onClick={() => select(conversation)}>
              <strong>{conversation.title}</strong>
              <span>
                {names.get(conversation.datasetId)} · {new Date(conversation.updatedAt).toLocaleDateString()}
              </span>
            </button>
          ))}
          {!results.length && <p className="text-muted">{needle ? '没有匹配的会话' : '暂无历史会话'}</p>}
        </div>
      </Modal>
    </>
  );
}
