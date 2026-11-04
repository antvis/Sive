import { useState } from 'react';
import { Button, Dropdown, Input } from './ui';
import { ClockCounterClockwiseIcon, MagnifyingGlassIcon } from '@phosphor-icons/react';
import type { Conversation } from '../../shared/contracts';

export default function ConversationHistory({
  conversations,
  currentId,
  disabled,
  onSelect,
}: {
  conversations: Conversation[];
  currentId: string;
  disabled: boolean;
  onSelect: (conversation: Conversation) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const filtered = conversations.filter((item) =>
    item.title.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()),
  );
  return (
    <Dropdown
      placement="bottomRight"
      open={open && !disabled}
      onOpenChange={(value) => {
        setOpen(value);
        if (!value) setSearch('');
      }}
      menu={{
        className: 'conversation-history-menu',
        selectedKeys: [currentId],
        items: filtered.length
          ? filtered.map((item) => ({
              key: item.id,
              label: (
                <div className="conversation-history-item">
                  <div>
                    <strong title={item.title}>{item.title}</strong>
                    {item.id === currentId && <span>当前</span>}
                  </div>
                  <time dateTime={item.updatedAt}>{new Date(item.updatedAt).toLocaleString()}</time>
                </div>
              ),
            }))
          : [{ key: 'empty', disabled: true, label: search ? '没有匹配的会话' : '当前数据暂无会话' }],
        onClick: ({ key }) => {
          const item = conversations.find((entry) => entry.id === key);
          if (item) onSelect(item);
          setOpen(false);
          setSearch('');
        },
      }}
      popupRender={(menu) => (
        <div className="conversation-history-popup">
          <Input
            aria-label="搜索当前数据的会话"
            placeholder="搜索当前数据的会话"
            prefix={<MagnifyingGlassIcon />}
            allowClear
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Escape') {
                setOpen(false);
                setSearch('');
              }
              event.stopPropagation();
            }}
          />
          {menu}
        </div>
      )}
    >
      <Button
        size="small"
        title="会话历史"
        aria-label="会话历史"
        aria-expanded={open && !disabled}
        disabled={disabled}
        icon={<ClockCounterClockwiseIcon />}
      />
    </Dropdown>
  );
}
