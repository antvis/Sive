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
    <section className="sidebar-conversations" aria-label="当前数据源会话">
      <div className="sidebar-source-heading">
        <strong title={sourceName}>{sourceName}</strong>
        <Button
          variant="ghost"
          icon={<ComposeIcon />}
          disabled={disabled}
          onClick={onNew}
          aria-label="新建会话"
          title="新建会话"
        />
      </div>
      <div className="sidebar-conversation-list">
        {conversations.map((c) => (
          <div className="sidebar-conversation-row" key={c.id}>
            <button
              className={c.id === currentId ? 'active' : ''}
              aria-current={c.id === currentId ? 'page' : undefined}
              disabled={disabled}
              onClick={() => onSelect(c)}
            >
              <span title={c.title}>{c.title}</span>
              <time dateTime={c.updatedAt}>{new Date(c.updatedAt).toLocaleDateString()}</time>
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
                className="conversation-actions"
                variant="ghost"
                size="small"
                icon={<DotsThreeIcon />}
                aria-label={`会话操作：${c.title}`}
                title="会话操作"
              />
            </Dropdown>
          </div>
        ))}
        {!conversations.length && <p className="text-muted">暂无历史会话</p>}
      </div>
    </section>
  );
}
