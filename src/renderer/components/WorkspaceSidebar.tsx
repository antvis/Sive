import {
  Archive,
  CaretRight,
  Database,
  FileText,
  GearSix,
  Lightbulb,
  NotePencil,
  PencilSimple,
  SidebarSimple,
} from '@phosphor-icons/react';
import clsx from 'clsx';
import { Popover } from 'radix-ui';
import { useRef, useState } from 'react';
import type { PropsWithChildren } from 'react';
import { toast } from 'sonner';
import type { Conversation, DatasetSummary } from '../types';
import { errorMessage } from '../utils';
import { DataSourceLogo } from './DataSourceLogo';
import { IconButton } from './IconButton';

export type AppPage = 'welcome' | 'datasets' | 'analysis' | 'snippets' | 'settings';

export type WorkspaceSidebarProps = {
  page: AppPage;
  datasets: DatasetSummary[];
  conversationsByDataset: ReadonlyMap<string, Conversation[]>;
  recentConversations: Conversation[];
  activeDatasetId: string | null;
  activeConversationId: string | null;
  onConversationSelect: (conversation: Conversation) => void;
  onConversationCreate: (datasetId: string) => void;
  onConversationArchive: (conversation: Conversation) => void;
  onNavigate: (page: AppPage) => void;
};

const focusClass =
  'focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-sidebar-focus';
const rowClass = clsx(
  'relative flex h-[32px] min-w-0 items-center gap-[6px] rounded-[8px] px-[8px] text-left text-[14px] font-medium text-sidebar-text transition-[color,scale] motion-safe:active:scale-[0.98] disabled:opacity-45',
  focusClass,
);
const activeClass = 'bg-sidebar-highlight text-sidebar-ink!';
const iconClass = clsx(
  'relative rounded-[8px]! text-sidebar-muted! hover:bg-sidebar-highlight! hover:text-sidebar-ink!',
  focusClass,
);
const headingClass =
  'flex h-[32px] items-center justify-between gap-1 ps-[8px] text-[12.5px] font-medium text-sidebar-muted';

function SidebarList({ children }: PropsWithChildren) {
  const highlight = useRef<HTMLSpanElement>(null);

  return (
    <div
      className="relative grid gap-px"
      onPointerOver={(event) => {
        if (event.pointerType === 'touch' || !highlight.current || !(event.target instanceof Element)) return;
        const row = event.target.closest('[data-sidebar-row]');
        if (!row || row.matches(':disabled')) {
          highlight.current.style.opacity = '0';
          return;
        }
        const list = event.currentTarget.getBoundingClientRect();
        const bounds = row.getBoundingClientRect();
        Object.assign(highlight.current.style, {
          transform: `translate(${bounds.left - list.left}px, ${bounds.top - list.top}px)`,
          width: `${bounds.width}px`,
          height: `${bounds.height}px`,
          opacity: '1',
        });
      }}
      onPointerLeave={() => {
        if (highlight.current) highlight.current.style.opacity = '0';
      }}
    >
      <span
        ref={highlight}
        aria-hidden
        className="pointer-events-none absolute start-0 top-0 rounded-[7px] bg-sidebar-highlight opacity-0 transition-[transform,width,height,opacity] duration-[220ms] ease-[cubic-bezier(.23,1,.32,1)] motion-reduce:transition-none"
      />
      {children}
    </div>
  );
}

function NewConversationButton({
  datasets,
  datasetId,
  compact = false,
  collapsed = false,
  onCreate,
}: {
  datasets: DatasetSummary[];
  datasetId?: string | null;
  compact?: boolean;
  collapsed?: boolean;
  onCreate: (datasetId: string) => void;
}) {
  const label = compact ? '新建对话' : '新建分析';
  const disabled = !datasets.length;
  const title = disabled ? '请先添加数据源' : label;
  const button = compact ? (
    <IconButton
      icon={NotePencil}
      label={label}
      title={title}
      className={clsx(iconClass, 'size-[32px]!')}
      disabled={disabled}
    />
  ) : (
    <button
      type="button"
      className={clsx(rowClass, collapsed && 'justify-center')}
      data-sidebar-row
      disabled={disabled}
      title={title}
      onClick={datasetId ? () => onCreate(datasetId) : undefined}
    >
      <NotePencil size={16} className="shrink-0" aria-hidden />
      <span className={collapsed ? 'sr-only' : undefined}>{label}</span>
    </button>
  );

  if (datasetId) return button;

  return (
    <Popover.Root>
      <Popover.Trigger asChild>{button}</Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          aria-label="选择数据源"
          side={compact ? 'top' : collapsed ? 'right' : 'bottom'}
          align={compact ? 'end' : 'start'}
          sideOffset={4}
          collisionPadding={8}
          className="z-50 max-h-(--radix-popover-content-available-height) w-[208px] overflow-y-auto rounded-[8px] border border-line bg-surface p-1 shadow-lg"
        >
          <p className="px-[8px] py-1 text-[12.5px] font-medium text-sidebar-muted">选择数据源</p>
          {datasets.map((dataset) => (
            <Popover.Close key={dataset.id} asChild>
              <button
                type="button"
                className={clsx(rowClass, 'w-full hover:bg-sidebar-highlight')}
                title={dataset.name}
                onClick={() => onCreate(dataset.id)}
              >
                <DataSourceLogo type={dataset.sourceType} size={16} />
                <span className="truncate">{dataset.name}</span>
              </button>
            </Popover.Close>
          ))}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

function ConversationItem({
  conversation,
  sourceName,
  active,
  onSelect,
  onArchive,
}: {
  conversation: Conversation;
  sourceName?: string;
  active: boolean;
  onSelect: () => void;
  onArchive: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(conversation.title);
  const [busy, setBusy] = useState(false);
  const renameCancelled = useRef(false);

  const saveName = async () => {
    if (renameCancelled.current) {
      renameCancelled.current = false;
      return;
    }
    if (!editing || busy) return;
    const title = name.trim();
    if (!title || title === conversation.title) {
      setName(conversation.title);
      setEditing(false);
      return;
    }
    setBusy(true);
    try {
      await window.workbench.conversationRename(conversation.id, title);
      setEditing(false);
      toast.success('会话标题已修改');
    } catch (cause) {
      toast.error(errorMessage(cause));
    } finally {
      setBusy(false);
    }
  };

  const archive = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await window.workbench.conversationArchive(conversation.id);
      onArchive();
      toast.success('分析任务已归档');
    } catch (cause) {
      toast.error(errorMessage(cause));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      data-sidebar-row
      className={clsx('group/conversation relative flex min-w-0 rounded-[8px]', active && activeClass)}
    >
      {editing ? (
        <input
          className={clsx(rowClass, 'w-full bg-surface')}
          value={name}
          disabled={busy}
          autoFocus
          aria-label="会话标题"
          onFocus={(event) => event.currentTarget.select()}
          onChange={(event) => setName(event.target.value)}
          onBlur={() => void saveName()}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.nativeEvent.isComposing) void saveName();
            if (event.key === 'Escape') {
              renameCancelled.current = true;
              setName(conversation.title);
              setEditing(false);
            }
          }}
        />
      ) : (
        <>
          <button
            type="button"
            aria-current={active || undefined}
            title={`${conversation.title}\n${new Date(conversation.updatedAt).toLocaleString('zh-CN')}`}
            className={clsx(
              rowClass,
              'w-full group-focus-within/conversation:pe-[52px] group-hover/conversation:pe-[52px]',
              active && 'text-sidebar-ink!',
            )}
            onClick={onSelect}
          >
            <span className="min-w-0 flex-1 truncate">{conversation.title}</span>
            {sourceName && (
              <span className="max-w-[40%] shrink-0 truncate text-[11px] font-normal text-sidebar-muted group-focus-within/conversation:hidden group-hover/conversation:hidden">
                {sourceName}
              </span>
            )}
          </button>
          <div className="absolute inset-y-0 end-1 flex items-center opacity-0 transition-opacity group-focus-within/conversation:opacity-100 group-hover/conversation:opacity-100">
            <IconButton
              icon={PencilSimple}
              iconSize={14}
              className={clsx(iconClass, 'size-[24px]!')}
              label={`重命名 ${conversation.title}`}
              disabled={busy}
              onClick={() => {
                renameCancelled.current = false;
                setName(conversation.title);
                setEditing(true);
              }}
            />
            <IconButton
              icon={Archive}
              iconSize={14}
              className={clsx(iconClass, 'size-[24px]!')}
              label={`归档 ${conversation.title}`}
              disabled={busy}
              onClick={() => void archive()}
            />
          </div>
        </>
      )}
    </div>
  );
}

export function WorkspaceSidebar({
  page,
  collapsed,
  onToggle,
  datasets,
  conversationsByDataset,
  recentConversations,
  activeDatasetId,
  activeConversationId,
  onConversationSelect,
  onConversationCreate,
  onConversationArchive,
  onNavigate,
}: WorkspaceSidebarProps & { collapsed: boolean; onToggle: () => void }) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [recentSelection, setRecentSelection] = useState<string | null>(null);
  const groups = datasets.flatMap((dataset) => {
    const conversations = conversationsByDataset.get(dataset.id);
    return conversations?.length ? [{ dataset, conversations }] : [];
  });
  const activeInRecent =
    recentSelection === activeConversationId &&
    recentConversations.some((conversation) => conversation.id === activeConversationId);
  const railRowClass = collapsed && 'justify-center';
  const labelClass = collapsed ? 'sr-only' : undefined;

  const createConversation = (datasetId: string) => {
    setExpanded((current) => ({ ...current, [datasetId]: true }));
    setRecentSelection(null);
    onConversationCreate(datasetId);
  };

  return (
    <aside
      className="flex h-full min-h-0 flex-col bg-sidebar-canvas pt-12 pb-[8px]"
      aria-label="工作台侧边栏"
    >
      <div
        className={clsx(
          'relative mb-6 shrink-0',
          collapsed ? 'mx-[8px] grid place-items-center' : 'mx-3 px-2',
        )}
      >
        {!collapsed && (
          <>
            <div className="flex items-center gap-2">
              <img className="size-7 dark:invert" src="./sive.svg" alt="" />
              <strong className="text-xl leading-6 font-semibold">Sive</strong>
            </div>
            <span className="mt-1.5 block text-xs leading-4 text-muted-foreground">
              See it Live, Share it Real.
            </span>
          </>
        )}
        <IconButton
          icon={SidebarSimple}
          label={collapsed ? '展开侧边栏' : '收起侧边栏'}
          aria-expanded={!collapsed}
          aria-controls="sidebar-history"
          className={clsx(iconClass, 'size-[32px]!', !collapsed && 'absolute! -top-1 end-0')}
          onClick={onToggle}
        />
      </div>
      <nav className="mx-[8px]" aria-label="工作台">
        <SidebarList>
          <NewConversationButton
            datasets={datasets}
            datasetId={activeDatasetId}
            collapsed={collapsed}
            onCreate={createConversation}
          />
          <button
            type="button"
            data-sidebar-row
            className={clsx(
              rowClass,
              railRowClass,
              (page === 'welcome' || page === 'datasets') && activeClass,
            )}
            title={collapsed ? '数据源' : undefined}
            onClick={() => onNavigate(datasets.length ? 'datasets' : 'welcome')}
          >
            <Database size={16} aria-hidden />
            <span className={labelClass}>数据源</span>
          </button>
          <button
            type="button"
            data-sidebar-row
            className={clsx(rowClass, railRowClass, page === 'snippets' && activeClass)}
            title={collapsed ? '洞察 Snippet' : undefined}
            onClick={() => onNavigate('snippets')}
          >
            <Lightbulb size={16} aria-hidden />
            <span className={labelClass}>洞察 Snippet</span>
          </button>
        </SidebarList>
      </nav>
      <nav
        id="sidebar-history"
        hidden={collapsed}
        className="mx-[8px] mt-[12px] min-h-0 flex-1 overflow-y-auto"
        aria-label="分析历史"
      >
        {groups.length > 0 && (
          <section aria-labelledby="sidebar-datasets-heading">
            <h2 id="sidebar-datasets-heading" className={clsx(headingClass, 'mb-1')}>
              数据源
            </h2>
            <SidebarList>
              {groups.map(({ dataset, conversations }) => {
                const open = expanded[dataset.id] !== false;
                const SourceIcon = dataset.localFile ? FileText : Database;
                const groupId = `sidebar-conversations-${dataset.id}`;
                return (
                  <div key={dataset.id} className="grid min-w-0 gap-px">
                    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-px">
                      <button
                        type="button"
                        data-sidebar-row
                        aria-expanded={open}
                        aria-controls={groupId}
                        title={dataset.name}
                        className={rowClass}
                        onClick={() => setExpanded((current) => ({ ...current, [dataset.id]: !open }))}
                      >
                        <span
                          className={clsx(
                            'shrink-0 text-sidebar-muted motion-safe:transition-transform',
                            open && 'rotate-90',
                          )}
                        >
                          <CaretRight size={12} aria-hidden />
                        </span>
                        <SourceIcon size={16} className="shrink-0" aria-hidden />
                        <span className="truncate">{dataset.name}</span>
                      </button>
                      <IconButton
                        icon={NotePencil}
                        iconSize={16}
                        label={`在 ${dataset.name} 新建对话`}
                        className={clsx(iconClass, 'size-[32px]!')}
                        onClick={() => createConversation(dataset.id)}
                      />
                    </div>
                    <div id={groupId} hidden={!open}>
                      {open && (
                        <div className="grid min-w-0 gap-px ps-[24px]">
                          {conversations.map((conversation) => (
                            <ConversationItem
                              key={conversation.id}
                              conversation={conversation}
                              active={
                                page === 'analysis' &&
                                !activeInRecent &&
                                conversation.id === activeConversationId
                              }
                              onSelect={() => {
                                setRecentSelection(null);
                                onConversationSelect(conversation);
                              }}
                              onArchive={() => onConversationArchive(conversation)}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </SidebarList>
          </section>
        )}
        <section className="mt-[12px]" aria-labelledby="sidebar-recent-heading">
          <div className={clsx(headingClass, 'mb-1')}>
            <h2 id="sidebar-recent-heading">最近</h2>
            <NewConversationButton compact datasets={datasets} onCreate={createConversation} />
          </div>
          <SidebarList>
            {recentConversations.map((conversation) => (
              <ConversationItem
                key={conversation.id}
                conversation={conversation}
                sourceName={datasets.find((dataset) => dataset.id === conversation.datasetId)?.name}
                active={page === 'analysis' && activeInRecent && conversation.id === activeConversationId}
                onSelect={() => {
                  setRecentSelection(conversation.id);
                  onConversationSelect(conversation);
                }}
                onArchive={() => onConversationArchive(conversation)}
              />
            ))}
            {!recentConversations.length && (
              <p className="px-[8px] py-1 text-[12px] text-sidebar-muted">暂无对话</p>
            )}
          </SidebarList>
        </section>
      </nav>
      <button
        type="button"
        className={clsx(
          rowClass,
          'mx-[8px] shrink-0 hover:bg-sidebar-highlight',
          collapsed ? 'mt-auto justify-center' : 'mt-[8px]',
          page === 'settings' && activeClass,
        )}
        title={collapsed ? '设置' : undefined}
        onClick={() => onNavigate('settings')}
      >
        <GearSix size={16} aria-hidden />
        <span className={labelClass}>设置</span>
      </button>
    </aside>
  );
}
