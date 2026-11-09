import { navigationIconButton } from '@renderer/components/layout/navigationStyles';
import { useEffect, useRef, useState } from 'react';
import { MagnifyingGlassIcon } from '@phosphor-icons/react';
import type { Conversation, Dataset } from '@shared/contracts';
import { Button, Input, Modal, Tooltip } from '@renderer/components/ui/index';

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
      <span className="ml-auto">
        <Tooltip
          title={
            <span className="inline-flex items-center gap-2.5">
              搜索会话{' '}
              <kbd className="font-[family-name:inherit] py-0.5 px-1 border border-current rounded-compact text-helper font-normal leading-[1.2] opacity-65">
                {shortcut}
              </kbd>
            </span>
          }
        >
          <Button
            className={navigationIconButton}
            variant="ghost"
            icon={<MagnifyingGlassIcon size={18} />}
            aria-label={`搜索所有会话 (${shortcut})`}
            aria-keyshortcuts="Meta+K Control+K"
            onClick={show}
          />
        </Tooltip>
      </span>
      <Modal
        title={
          <span className="inline-flex items-center gap-2.5">
            搜索会话{' '}
            <kbd className="font-[family-name:inherit] py-0.5 px-1 border border-current rounded-compact text-helper font-normal leading-[1.2] opacity-65">
              {shortcut}
            </kbd>
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
        <div className="max-h-90 overflow-y-auto mt-3">
          {results.map((conversation) => (
            <button
              className="flex flex-col gap-1 w-full p-3 border-0 rounded-control text-left bg-transparent text-ink wrap-anywhere hover:bg-page focus-visible:bg-page"
              key={conversation.id}
              disabled={disabled}
              onClick={() => select(conversation)}
            >
              <strong>{conversation.title}</strong>
              <span className="text-helper text-muted">
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
