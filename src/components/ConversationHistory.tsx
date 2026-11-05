import { cx } from '../shared/cx';
import { navigationItem, navigationIconButton } from './navigation-styles';
import { Button, Tooltip } from './ui';
import { ArchiveIcon } from '@phosphor-icons/react';
import type { Conversation } from '../../shared/contracts';

export default function ConversationHistory({
  conversations,
  currentId,
  disabled,
  onSelect,
  archiveDisabled,
  onArchive,
}: {
  archiveDisabled: (conversation: Conversation) => boolean;
  onArchive: (conversation: Conversation) => void;
  conversations: Conversation[];
  currentId: string;
  disabled: boolean;
  onSelect: (conversation: Conversation) => void;
}) {
  return (
    <section
      className="flex flex-col gap-2.5 min-h-0 mt-6 pt-4 border-t border-t-line"
      aria-label="当前数据源会话"
    >
      <div className="overflow-y-auto min-h-0">
        {conversations.map((c) => (
          <div className="group/history relative" key={c.id}>
            <button
              className={cx(navigationItem, 'flex-col items-stretch gap-1 pr-9.5')}
              aria-current={c.id === currentId ? 'page' : undefined}
              disabled={disabled}
              onClick={() => onSelect(c)}
            >
              <span className="overflow-hidden text-ellipsis whitespace-nowrap text-helper" title={c.title}>
                {c.title}
              </span>
              <time className="text-muted text-tiny" dateTime={c.updatedAt}>
                {new Date(c.updatedAt).toLocaleDateString()}
              </time>
            </button>
            <div className="absolute right-1 top-2 opacity-0 pointer-events-none group-hover/history:opacity-100 group-hover/history:pointer-events-auto group-focus-within/history:opacity-100 group-focus-within/history:pointer-events-auto [@media(hover:none)]:opacity-100 [@media(hover:none)]:pointer-events-auto">
              <Tooltip title="归档会话">
                <Button
                  className={cx(navigationIconButton, 'size-7 p-[5px] [&>svg]:size-4.5')}
                  variant="ghost"
                  size="small"
                  icon={<ArchiveIcon />}
                  disabled={archiveDisabled(c)}
                  onClick={() => onArchive(c)}
                  aria-label={`归档会话：${c.title}`}
                />
              </Tooltip>
            </div>
          </div>
        ))}
        {!conversations.length && <p className="text-muted px-2.5 text-helper">暂无历史会话</p>}
      </div>
    </section>
  );
}
