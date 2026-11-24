import clsx from 'clsx';
import {
  ArchiveIcon,
  ChevronRightIcon,
  DatabaseIcon,
  FileTextIcon,
  LightbulbIcon,
  PanelLeftIcon,
  PencilIcon,
  SettingsIcon,
  SquarePenIcon,
} from 'lucide-react';
import { Popover } from 'radix-ui';
import { useRef, useState } from 'react';
import type { PropsWithChildren } from 'react';
import { toast } from 'sonner';
import type { Conversation, DatasetSummary } from '../types';
import { errorMessage } from '../utils';
import { IconButton, panelControlClassName } from './IconButton';
import { panelCollapsePreviewClassName } from './ResizeHandle';

export type AppPage = 'welcome' | 'datasets' | 'analysis' | 'snippets' | 'settings';

export const WORKSPACE_SIDEBAR_ID = 'workspace-sidebar';

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
  'relative flex min-h-9 min-w-0 items-center gap-[6px] rounded-[8px] px-[8px] text-left text-sm text-sidebar-text transition-[color,scale] motion-safe:active:scale-[0.98] disabled:opacity-45',
  focusClass,
);
const activeClass = 'bg-sidebar-highlight text-sidebar-ink!';
const iconClass = clsx(
  'relative rounded-[8px]! text-sidebar-muted! hover:bg-sidebar-highlight! hover:text-sidebar-ink!',
  focusClass,
);
const headingClass =
  'flex min-h-9 items-center justify-between gap-1 ps-[8px] text-xs text-sidebar-muted';

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

export function NewConversationButton({
  datasets,
  datasetId,
  compact = false,
  onCreate,
}: {
  datasets: DatasetSummary[];
  datasetId?: string | null;
  compact?: boolean;
  onCreate: (datasetId: string) => void;
}) {
  const label = compact ? '新建对话' : '新建分析';
  const disabled = !datasets.length;
  const title = disabled ? '请先添加数据源' : label;
  const createForActiveDataset = datasetId ? () => onCreate(datasetId) : undefined;
  const button = compact ? (
    <IconButton
      icon={SquarePenIcon}
      label={label}
      title={title}
      className={clsx(iconClass, 'size-[32px]! [-webkit-app-region:no-drag]')}
      disabled={disabled}
      onClick={createForActiveDataset}
    />
  ) : (
    <button
      type="button"
      className={rowClass}
      data-sidebar-row
      disabled={disabled}
      title={title}
      onClick={createForActiveDataset}
    >
      <SquarePenIcon size={16} className="shrink-0" aria-hidden />
      <span>{label}</span>
    </button>
  );

  if (datasetId) return button;

  return (
    <Popover.Root>
      <Popover.Trigger asChild>{button}</Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          aria-label="选择数据源"
          side={compact ? 'top' : 'bottom'}
          align={compact ? 'end' : 'start'}
          sideOffset={4}
          collisionPadding={8}
          className="z-50 max-h-(--radix-popover-content-available-height) w-[208px] overflow-y-auto rounded-[8px] border border-line bg-surface p-1 shadow-lg"
        >
          <p className="px-[8px] py-1 text-xs text-sidebar-muted">选择数据源</p>
          {datasets.map((dataset) => {
            const SourceIcon = dataset.localFile ? FileTextIcon : DatabaseIcon;
            return (
              <Popover.Close key={dataset.id} asChild>
                <button
                  type="button"
                  className={clsx(rowClass, 'w-full hover:bg-sidebar-highlight')}
                  title={dataset.name}
                  onClick={() => onCreate(dataset.id)}
                >
                  <SourceIcon size={16} className="shrink-0" aria-hidden />
                  <span className="truncate">{dataset.name}</span>
                </button>
              </Popover.Close>
            );
          })}
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
              <span className="max-w-[40%] shrink-0 truncate text-xs font-normal text-sidebar-muted group-focus-within/conversation:hidden group-hover/conversation:hidden">
                {sourceName}
              </span>
            )}
          </button>
          <div className="absolute inset-y-0 end-1 flex items-center opacity-0 transition-opacity group-focus-within/conversation:opacity-100 group-hover/conversation:opacity-100">
            <IconButton
              icon={PencilIcon}
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
              icon={ArchiveIcon}
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
  inert,
  collapsePending,
  onCollapse,
  datasets,
  conversationsByDataset,
  recentConversations,
  activeDatasetId,
  activeConversationId,
  onConversationSelect,
  onConversationCreate,
  onConversationArchive,
  onNavigate,
}: WorkspaceSidebarProps & { inert?: boolean; collapsePending: boolean; onCollapse: () => void }) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [recentSelection, setRecentSelection] = useState<string | null>(null);
  const groups = datasets.flatMap((dataset) => {
    const conversations = conversationsByDataset.get(dataset.id);
    return conversations?.length ? [{ dataset, conversations }] : [];
  });
  const activeInRecent =
    recentSelection === activeConversationId &&
    recentConversations.some((conversation) => conversation.id === activeConversationId);

  const createConversation = (datasetId: string) => {
    setExpanded((current) => ({ ...current, [datasetId]: true }));
    setRecentSelection(null);
    onConversationCreate(datasetId);
  };

  return (
    <aside
      id={WORKSPACE_SIDEBAR_ID}
      className={clsx(
        'flex min-h-0 min-w-[160px] flex-1 flex-col overflow-hidden rounded-[16px] bg-sidebar-canvas pb-[8px]',
        panelCollapsePreviewClassName,
      )}
      aria-label="工作台侧边栏"
      inert={inert}
      data-collapse-pending={collapsePending || undefined}
    >
      <header className="relative shrink-0 pt-(--workspace-sidebar-titlebar-offset) [-webkit-app-region:drag]">
        <div className="@container flex h-(--workspace-titlebar-height) items-center ps-[16px] pe-[44px]">
          <div className="flex items-center">
            <img
              className="h-6 w-0 shrink-0 object-contain opacity-0 motion-safe:transition-[width,margin-inline-end,opacity] motion-safe:duration-150 @min-[64px]:me-1.5 @min-[64px]:w-6 @min-[64px]:opacity-100 dark:invert"
              src="./sive.svg"
              alt=""
            />
            <span className="truncate text-xl text-sidebar-ink">Sive</span>
          </div>
        </div>
        <div className="absolute end-[8px] top-(--workspace-titlebar-center) flex -translate-y-1/2">
          <IconButton
            icon={PanelLeftIcon}
            iconSize={18}
            label="收起侧边栏"
            aria-expanded
            aria-controls={WORKSPACE_SIDEBAR_ID}
            className={panelControlClassName}
            onClick={onCollapse}
          />
        </div>
      </header>
      <p className="mt-1 mb-5 shrink-0 px-[16px] text-xs text-muted-foreground">
        See it Live, Share it Real.
      </p>
      <nav className="mx-[8px]" aria-label="工作台">
        <SidebarList>
          <NewConversationButton
            datasets={datasets}
            datasetId={activeDatasetId}
            onCreate={createConversation}
          />
          <button
            type="button"
            data-sidebar-row
            className={clsx(rowClass, (page === 'welcome' || page === 'datasets') && activeClass)}
            onClick={() => onNavigate(datasets.length ? 'datasets' : 'welcome')}
          >
            <DatabaseIcon size={16} aria-hidden />
            <span>数据源</span>
          </button>
          <button
            type="button"
            data-sidebar-row
            className={clsx(rowClass, page === 'snippets' && activeClass)}
            onClick={() => onNavigate('snippets')}
          >
            <LightbulbIcon size={16} aria-hidden />
            <span>洞察 Snippet</span>
          </button>
        </SidebarList>
      </nav>
      <nav className="mx-[8px] mt-[12px] min-h-0 flex-1 overflow-y-auto" aria-label="分析历史">
        {groups.length > 0 && (
          <section aria-labelledby="sidebar-datasets-heading">
            <h2 id="sidebar-datasets-heading" className={clsx(headingClass, 'mb-1')}>
              数据源
            </h2>
            <SidebarList>
              {groups.map(({ dataset, conversations }) => {
                const open = expanded[dataset.id] !== false;
                const SourceIcon = dataset.localFile ? FileTextIcon : DatabaseIcon;
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
                          <ChevronRightIcon size={12} aria-hidden />
                        </span>
                        <SourceIcon size={16} className="shrink-0" aria-hidden />
                        <span className="truncate">{dataset.name}</span>
                      </button>
                      <IconButton
                        icon={SquarePenIcon}
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
              <p className="px-[8px] py-1 text-sm text-sidebar-muted">暂无对话</p>
            )}
          </SidebarList>
        </section>
      </nav>
      <button
        type="button"
        className={clsx(
          rowClass,
          'mx-[8px] mt-[8px] shrink-0 hover:bg-sidebar-highlight',
          page === 'settings' && activeClass,
        )}
        onClick={() => onNavigate('settings')}
      >
        <SettingsIcon size={16} aria-hidden />
        <span>设置</span>
      </button>
    </aside>
  );
}
