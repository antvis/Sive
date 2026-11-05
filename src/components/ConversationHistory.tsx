import { cx } from '../shared/cx';
import { navigationItem, navigationIconButton } from './navigation-styles';
import ComposeIcon from './ComposeIcon';
import { Button, Dropdown } from './ui';
import { DotsThreeIcon, DownloadSimpleIcon, TrashIcon } from '@phosphor-icons/react';
import type { Conversation } from '../../shared/contracts';

export default function ConversationHistory({
  sourceName,
  conversations,
  currentId,
  disabled,
  onSelect,
  onNew,
  exporting,
  deleteDisabled,
  onExport,
  onDelete,
}: {
  exporting: boolean;
  deleteDisabled: (conversation: Conversation) => boolean;
  onExport: (conversation: Conversation, format: 'html' | 'md') => void;
  onDelete: (conversation: Conversation) => void;
  sourceName: string;
  conversations: Conversation[];
  currentId: string;
  disabled: boolean;
  onSelect: (conversation: Conversation) => void;
  onNew: () => void;
}) {
  return (
    <section
      className="flex flex-col gap-2.5 min-h-0 mt-6 pt-4 border-t border-t-line"
      aria-label="当前数据源会话"
    >
      <div className="flex items-center gap-1 pl-2.5">
        <strong
          className="overflow-hidden text-ellipsis whitespace-nowrap text-helper flex-1 min-w-0"
          title={sourceName}
        >
          {sourceName}
        </strong>
        <Button
          className={cx(navigationIconButton, '[&>svg]:size-[15px]')}
          variant="ghost"
          icon={<ComposeIcon />}
          disabled={disabled}
          onClick={onNew}
          aria-label="新建会话"
          title="新建会话"
        />
      </div>
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
            <Dropdown
              menu={{
                items: [
                  { key: 'html', label: '导出 HTML', icon: <DownloadSimpleIcon />, disabled: exporting },
                  { key: 'md', label: '导出 Markdown', icon: <DownloadSimpleIcon />, disabled: exporting },
                  {
                    key: 'delete',
                    label: '删除会话',
                    icon: <TrashIcon />,
                    danger: true,
                    disabled: deleteDisabled(c) || exporting,
                  },
                ],
                onClick: ({ key }) => (key === 'delete' ? onDelete(c) : onExport(c, key as 'html' | 'md')),
              }}
            >
              <Button
                className={cx(
                  navigationIconButton,
                  'absolute right-1 top-2 size-7 p-[5px] opacity-0 group-hover/history:opacity-100 group-focus-within/history:opacity-100 data-[state=open]:opacity-100 [&>svg]:size-4.5',
                )}
                variant="ghost"
                size="small"
                icon={<DotsThreeIcon />}
                aria-label={`会话操作：${c.title}`}
                title="会话操作"
              />
            </Dropdown>
          </div>
        ))}
        {!conversations.length && <p className="text-muted px-2.5 text-helper">暂无历史会话</p>}
      </div>
    </section>
  );
}
