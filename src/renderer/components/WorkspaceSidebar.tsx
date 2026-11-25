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
import { useRef, useState } from 'react';
import { toast } from 'sonner';
import type { Conversation, DatasetSummary } from '../types';
import { errorMessage } from '../utils';
import { ConversationStatus } from './ConversationStatus';
import { Button } from './ui/button';
import { SidebarButton, SidebarInput, SidebarList } from './ui/sidebar';

export type AppPage = 'welcome' | 'datasets' | 'analysis' | 'snippets';

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

function ConversationItem({
  conversation,
  active,
  onSelect,
  onArchive,
}: {
  conversation: Conversation;
  active: boolean;
  onSelect: () => void;
  onArchive: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(conversation.title);
  const [busy, setBusy] = useState(false);
  const originalTitle = useRef(conversation.title);
  const renameCancelled = useRef(false);

  const saveName = async () => {
    if (renameCancelled.current) {
      renameCancelled.current = false;
      return;
    }
    if (!editing || busy) return;
    const title = name.trim();
    if (!title || title === originalTitle.current || title === conversation.title) {
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
      className="group/conversation relative flex min-w-0 rounded-lg [--sidebar-row-height:28px]"
    >
      {editing ? (
        <SidebarInput
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
          <SidebarButton
            aria-current={active || undefined}
            title={`${conversation.title}\n${new Date(conversation.updatedAt).toLocaleString('zh-CN')}`}
            className="w-full group-focus-within/conversation:pe-[52px] group-hover/conversation:pe-[52px]"
            onClick={onSelect}
          >
            <span className="min-w-0 flex-1 truncate">{conversation.title}</span>
            <span className="shrink-0 group-focus-within/conversation:hidden group-hover/conversation:hidden">
              <ConversationStatus ids={[conversation.id]} />
            </span>
          </SidebarButton>
          <div className="absolute inset-y-0 end-1 flex items-center opacity-0 transition-opacity group-focus-within/conversation:opacity-100 group-hover/conversation:opacity-100">
            <Button
              variant="ghost"
              size="icon-xs"
              aria-label={`重命名 ${conversation.title}`}
              title={`重命名 ${conversation.title}`}
              disabled={busy}
              onClick={() => {
                renameCancelled.current = false;
                originalTitle.current = conversation.title;
                setName(conversation.title);
                setEditing(true);
              }}
            >
              <PencilIcon className="size-[14px]" aria-hidden />
            </Button>
            <Button
              variant="ghost"
              size="icon-xs"
              aria-label={`归档 ${conversation.title}`}
              title={`归档 ${conversation.title}`}
              disabled={busy}
              onClick={() => void archive()}
            >
              <ArchiveIcon className="size-[14px]" aria-hidden />
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

export function WorkspaceSidebar({
  page,
  inert,
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
}: WorkspaceSidebarProps & { inert?: boolean; onCollapse: () => void }) {
  const initialDatasetId = activeDatasetId ?? datasets[0]?.id;
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [recentSelection, setRecentSelection] = useState<string | null>(null);
  const groups = datasets.flatMap((dataset) => {
    const conversations = conversationsByDataset.get(dataset.id);
    return conversations?.length ? [{ dataset, conversations }] : [];
  });
  const activeInRecent =
    recentSelection === activeConversationId &&
    recentConversations.some((conversation) => conversation.id === activeConversationId);

  const createConversation = (datasetId = initialDatasetId) => {
    if (!datasetId) return;

    setExpanded((current) => ({ ...current, [datasetId]: true }));
    setRecentSelection(null);
    onConversationCreate(datasetId);
  };

  return (
    <aside
      id={WORKSPACE_SIDEBAR_ID}
      className="flex min-h-0 min-w-[160px] flex-1 flex-col overflow-hidden rounded-[16px] bg-sidebar-canvas pb-[8px] text-base text-sidebar-ink"
      aria-label="工作台侧边栏"
      inert={inert}
    >
      <header
        className={clsx(
          'relative shrink-0 [-webkit-app-region:drag]',
          window.workbench.isMacOS
            ? 'pt-[max(var(--workspace-sidebar-titlebar-offset),calc(var(--workspace-titlebar-height)-var(--workspace-gutter)))]'
            : 'pt-(--workspace-sidebar-titlebar-offset)',
        )}
      >
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
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="收起侧边栏"
            title="收起侧边栏"
            aria-expanded
            aria-controls={WORKSPACE_SIDEBAR_ID}
            onClick={onCollapse}
          >
            <PanelLeftIcon className="size-[16px]" aria-hidden />
          </Button>
        </div>
      </header>
      <p className="mt-1 mb-5 shrink-0 px-[16px] text-base text-muted-foreground">
        See it Live, Share it Real.
      </p>
      <nav className="mx-[8px] [--sidebar-row-height:32px]" aria-label="工作台">
        <SidebarList>
          <SidebarButton
            disabled={!initialDatasetId}
            title={initialDatasetId ? '新建分析' : '请先添加数据源'}
            onClick={() => createConversation()}
          >
            <SquarePenIcon size={16} className="shrink-0" aria-hidden />
            <span>新建分析</span>
          </SidebarButton>
          <SidebarButton
            aria-current={page === 'welcome' || page === 'datasets' || undefined}
            onClick={() => onNavigate(datasets.length ? 'datasets' : 'welcome')}
          >
            <DatabaseIcon size={16} aria-hidden />
            <span>数据源</span>
          </SidebarButton>
          <SidebarButton
            aria-current={page === 'snippets' || undefined}
            onClick={() => onNavigate('snippets')}
          >
            <LightbulbIcon size={16} aria-hidden />
            <span>洞察 Snippet</span>
          </SidebarButton>
        </SidebarList>
      </nav>
      <nav className="mx-[8px] mt-[20px] flex min-h-0 flex-1 flex-col gap-[20px]" aria-label="分析历史">
        {groups.length > 0 && (
          <section className="flex max-h-1/2 min-h-0 flex-col" aria-labelledby="sidebar-datasets-heading">
            <h2
              id="sidebar-datasets-heading"
              className="mb-1 flex min-h-[32px] shrink-0 items-center justify-between gap-1 ps-2 text-xs font-normal text-sidebar-text/80"
            >
              数据源
            </h2>
            <SidebarList className="min-h-0 overflow-y-auto [--sidebar-row-gap:6px] scrollbar-none">
              {groups.map(({ dataset, conversations }) => {
                const open = expanded[dataset.id] !== false;
                const SourceIcon = dataset.localFile ? FileTextIcon : DatabaseIcon;
                const groupId = `sidebar-conversations-${dataset.id}`;
                return (
                  <div key={dataset.id} className="grid min-w-0 gap-1">
                    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-px">
                      <SidebarButton
                        aria-expanded={open}
                        aria-controls={groupId}
                        title={dataset.name}
                        onClick={() => setExpanded((current) => ({ ...current, [dataset.id]: !open }))}
                      >
                        <span
                          className={clsx(
                            'shrink-0 text-black/50 dark:text-white/50 motion-safe:transition-transform',
                            open && 'rotate-90',
                          )}
                        >
                          <ChevronRightIcon size={12} aria-hidden />
                        </span>
                        <SourceIcon size={16} className="shrink-0" aria-hidden />
                        <span className="min-w-0 flex-1 truncate">{dataset.name}</span>
                        {!open && (
                          <ConversationStatus ids={conversations.map((conversation) => conversation.id)} />
                        )}
                      </SidebarButton>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`在 ${dataset.name} 新建对话`}
                        title={`在 ${dataset.name} 新建对话`}
                        className="text-black/50 dark:text-white/50"
                        onClick={() => createConversation(dataset.id)}
                      >
                        <SquarePenIcon className="size-[14px]" aria-hidden />
                      </Button>
                    </div>
                    <div id={groupId} hidden={!open}>
                      {open && (
                        <SidebarList className="max-h-56 min-w-0 overflow-y-auto ps-[24px] [--sidebar-row-gap:2px] scrollbar-none">
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
                        </SidebarList>
                      )}
                    </div>
                  </div>
                );
              })}
            </SidebarList>
          </section>
        )}
        <section className="flex min-h-0 flex-col" aria-labelledby="sidebar-recent-heading">
          <div className="mb-1 flex min-h-[32px] shrink-0 items-center justify-between gap-1 ps-2 text-xs font-normal text-sidebar-text/80">
            <h2 id="sidebar-recent-heading">最近</h2>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="新建对话"
              title={initialDatasetId ? '新建对话' : '请先添加数据源'}
              className="text-black/50 dark:text-white/50"
              disabled={!initialDatasetId}
              onClick={() => createConversation()}
            >
              <SquarePenIcon className="size-[14px]" aria-hidden />
            </Button>
          </div>
          <SidebarList className="min-h-0 overflow-y-auto [--sidebar-row-gap:2px] scrollbar-none">
            {recentConversations.map((conversation) => (
              <ConversationItem
                key={conversation.id}
                conversation={conversation}
                active={page === 'analysis' && activeInRecent && conversation.id === activeConversationId}
                onSelect={() => {
                  setRecentSelection(conversation.id);
                  onConversationSelect(conversation);
                }}
                onArchive={() => onConversationArchive(conversation)}
              />
            ))}
            {!recentConversations.length && (
              <p className="px-[8px] py-1 text-sm text-sidebar-text">暂无对话</p>
            )}
          </SidebarList>
        </section>
      </nav>
      <SidebarButton
        className="mx-2 mt-2 shrink-0"
        onClick={() =>
          void window.workbench.settingsOpen().catch((cause) => toast.error(errorMessage(cause)))
        }
      >
        <SettingsIcon size={16} aria-hidden />
        <span>设置</span>
      </SidebarButton>
    </aside>
  );
}
