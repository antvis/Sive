import clsx from 'clsx';
import {
  ArchiveIcon,
  ChevronRightIcon,
  DatabaseIcon,
  LightbulbIcon,
  PanelLeftIcon,
  PencilIcon,
  SettingsIcon,
  SquarePenIcon,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import type { Conversation, DatasetSummary } from '../types';
import { errorMessage } from '../utils';
import { ConversationStatus } from './ConversationStatus';
import { DataSourceLogo } from './DataSourceLogo';
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
      className="group/conversation relative flex min-w-0 rounded-lg"
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
  const [windowFullscreen, setWindowFullscreen] = useState(false);
  const isMacOS = window.workbench.isMacOS;
  const groups = datasets.flatMap((dataset) => {
    const conversations = conversationsByDataset.get(dataset.id);
    return conversations?.length ? [{ dataset, conversations }] : [];
  });
  const activeInRecent =
    recentSelection === activeConversationId &&
    recentConversations.some((conversation) => conversation.id === activeConversationId);

  useEffect(() => {
    let awaitingInitialState = true;
    const unsubscribe = window.workbench.windowOnFullscreenChange((fullscreen) => {
      awaitingInitialState = false;
      setWindowFullscreen(fullscreen);
    });
    void window.workbench
      .windowIsFullscreen()
      .then((fullscreen) => {
        if (awaitingInitialState) setWindowFullscreen(fullscreen);
      })
      .catch((cause) => console.error('读取窗口全屏状态失败', cause));

    return () => {
      awaitingInitialState = false;
      unsubscribe();
    };
  }, []);

  const createConversation = (datasetId = initialDatasetId) => {
    if (!datasetId) return;

    setExpanded((current) => ({ ...current, [datasetId]: true }));
    setRecentSelection(null);
    onConversationCreate(datasetId);
  };

  return (
    <aside
      id={WORKSPACE_SIDEBAR_ID}
      className="flex min-h-0 min-w-[160px] flex-1 flex-col overflow-hidden rounded-2xl bg-surface pb-3 text-base text-sidebar-ink"
      aria-label="工作台侧边栏"
      inert={inert}
    >
      <header
        className={clsx(
          'relative shrink-0 [-webkit-app-region:drag]',
          isMacOS
            ? 'pt-[calc(var(--workspace-titlebar-height)-var(--workspace-gutter))]'
            : 'pt-(--workspace-sidebar-titlebar-offset)',
        )}
      >
        <div className="flex h-(--workspace-titlebar-height) items-center gap-2 ps-4 pe-[8px]">
          <img
            className="h-[26px] w-auto shrink-0 dark:invert"
            src="./sive-wordmark.png?v=medium-spaced"
            alt="Sive"
            width={327}
            height={104}
          />
          <Button
            className={clsx(
              isMacOS
                ? [
                    'absolute top-[calc(var(--workspace-titlebar-height)/2-var(--workspace-gutter))] -translate-y-1/2',
                    windowFullscreen ? 'start-[8px]' : 'end-[8px]',
                  ]
                : windowFullscreen ? 'order-first' : 'ms-auto',
            )}
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
      <nav className="mx-2.5 mt-3" aria-label="工作台">
        <SidebarList className="[--sidebar-row-gap:0.15em] [--sidebar-row-height:auto] [&_[data-slot=sidebar-button]]:py-[0.45em]">
          <SidebarButton
            aria-current={(page === 'analysis' && !activeConversationId) || undefined}
            className="[&[aria-current=true]]:bg-transparent [&[aria-current=true]]:text-sidebar-text aria-[current=true]:font-normal"
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
      <nav className="mx-2.5 mt-6 flex min-h-0 flex-1 flex-col gap-4" aria-label="分析历史">
        {groups.length > 0 && (
          <section className="flex max-h-1/2 min-h-0 flex-col" aria-labelledby="sidebar-datasets-heading">
            <h2
              id="sidebar-datasets-heading"
              className="mb-1 flex min-h-[32px] shrink-0 items-center justify-between gap-1 ps-2 text-xs font-normal text-sidebar-text/80"
            >
              数据源
            </h2>
            <SidebarList className="min-h-0 overflow-y-auto [--sidebar-row-height:28px] scrollbar-none">
              {groups.map(({ dataset, conversations }) => {
                const open = expanded[dataset.id] !== false;
                const groupId = `sidebar-conversations-${dataset.id}`;
                return (
                  <div key={dataset.id} className="grid min-w-0 gap-[2px]">
                    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-px">
                      <SidebarButton
                        aria-expanded={open}
                        aria-controls={groupId}
                        title={dataset.name}
                        onClick={() => setExpanded((current) => ({ ...current, [dataset.id]: !open }))}
                      >
                        <span
                          className={clsx(
                            'shrink-0 text-muted-foreground motion-safe:transition-transform',
                            open && 'rotate-90',
                          )}
                        >
                          <ChevronRightIcon size={12} aria-hidden />
                        </span>
                        <DataSourceLogo type={dataset.sourceType} size={16} />
                        <span className="min-w-0 flex-1 truncate">{dataset.name}</span>
                        {!open && (
                          <ConversationStatus ids={conversations.map((conversation) => conversation.id)} />
                        )}
                      </SidebarButton>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        className="text-muted-foreground/75 focus-visible:text-ink"
                        aria-label={`在 ${dataset.name} 新建对话`}
                        title={`在 ${dataset.name} 新建对话`}
                        onClick={() => createConversation(dataset.id)}
                      >
                        <SquarePenIcon className="size-[14px]" aria-hidden />
                      </Button>
                    </div>
                    <div id={groupId} className="mb-[4px]" hidden={!open}>
                      {open && (
                        <SidebarList className="max-h-56 min-w-0 overflow-y-auto ps-[24px] [--sidebar-row-gap:1px] [--sidebar-row-height:26px] scrollbar-none">
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
              className="text-muted-foreground/75 focus-visible:text-ink"
              aria-label="新建对话"
              title={initialDatasetId ? '新建对话' : '请先添加数据源'}
              disabled={!initialDatasetId}
              onClick={() => createConversation()}
            >
              <SquarePenIcon className="size-[14px]" aria-hidden />
            </Button>
          </div>
          <SidebarList className="min-h-0 overflow-y-auto [--sidebar-row-gap:2px] [--sidebar-row-height:28px] scrollbar-none">
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
        className="mx-2.5 mt-2 shrink-0"
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
