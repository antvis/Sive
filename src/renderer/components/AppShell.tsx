import { Archive, Database, GearSix, Lightbulb, PencilSimple, Plus, X } from '@phosphor-icons/react';
import clsx from 'clsx';
import { useRef, useState } from 'react';
import type { PropsWithChildren } from 'react';
import { Group, Panel } from 'react-resizable-panels';
import { toast } from 'sonner';
import { errorMessage, readWidth, saveWidth } from '../utils';
import { getDatasetSource } from '../utils/dataSource';
import type { Conversation, DatasetSummary } from '../types';
import { IconButton } from './IconButton';
import { ResizeHandle } from './ResizeHandle';

export type AppPage = 'welcome' | 'datasets' | 'analysis' | 'snippets' | 'settings';

type AppShellProps = PropsWithChildren<{
  page: AppPage;
  hasDatasets: boolean;
  datasetTabs: DatasetSummary[];
  activeDatasetId: string | null;
  conversations: Conversation[];
  activeConversationId: string | null;
  onDatasetSelect: (id: string) => void;
  onDatasetClose: (id: string) => void;
  onConversationSelect: (id: string) => void;
  onConversationCreate: () => void;
  onConversationArchive: (id: string) => void;
  onNavigate: (page: AppPage) => void;
}>;

const itemClass = (active: boolean) =>
  clsx(
    'flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm',
    active ? 'bg-accent-soft text-accent' : 'text-muted hover:bg-surface hover:text-ink',
  );

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
      className={clsx(
        'group flex items-center rounded-lg',
        active ? 'bg-accent-soft text-accent' : 'text-muted hover:bg-surface hover:text-ink',
      )}
    >
      {editing ? (
        <input
          className="m-1 min-w-0 flex-1 rounded-md bg-page px-2 py-1 text-sm outline-none focus:bg-accent-soft"
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
        <button
          type="button"
          title={conversation.title}
          className="min-w-0 flex-1 px-3 py-2 text-left text-sm"
          onClick={onSelect}
        >
          <span className="block truncate">{conversation.title}</span>
          <time className="mt-1 block text-xs text-muted" dateTime={conversation.updatedAt}>
            {new Date(conversation.updatedAt).toLocaleString('zh-CN')}
          </time>
        </button>
      )}
      {!editing && (
        <div className="flex shrink-0 pr-1 opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100">
          <IconButton
            icon={PencilSimple}
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
            label={`归档 ${conversation.title}`}
            disabled={busy}
            onClick={() => void archive()}
          />
        </div>
      )}
    </div>
  );
}

export function AppShell({
  page,
  hasDatasets,
  datasetTabs,
  activeDatasetId,
  conversations,
  activeConversationId,
  onDatasetSelect,
  onDatasetClose,
  onConversationSelect,
  onConversationCreate,
  onConversationArchive,
  onNavigate,
  children,
}: AppShellProps) {
  const [sidebarWidth] = useState(() => readWidth('sive.sidebar-width', 210));
  return (
    <Group orientation="horizontal" className="h-screen overflow-hidden bg-page">
      <Panel
        id="app-sidebar"
        defaultSize={sidebarWidth}
        minSize={160}
        maxSize={280}
        className="h-full min-h-0"
        onResize={(size) => saveWidth('sive.sidebar-width', size.inPixels)}
      >
        <aside className="flex h-full min-h-0 flex-col overflow-hidden px-3 pt-12 pb-5">
          <div className="mb-6 px-2">
            <div className="flex items-center gap-2">
              <img className="brand-logo" src="./sive.svg" alt="" />
              <strong className="text-xl leading-6 font-semibold">Sive</strong>
            </div>
            <span className="mt-1.5 block text-[11px] leading-4 whitespace-nowrap text-muted">
              See it Live, Share it Real.
            </span>
          </div>
          <button
            className={itemClass(false)}
            disabled={!activeDatasetId}
            title={activeDatasetId ? '新建分析' : '请先打开数据集'}
            onClick={onConversationCreate}
          >
            <Plus size={17} />
            新建分析
          </button>
          <button
            className={itemClass(page === 'welcome' || page === 'datasets' || page === 'analysis')}
            onClick={() => onNavigate(hasDatasets ? 'datasets' : 'welcome')}
          >
            <Database size={17} />
            数据源
          </button>
          <button className={itemClass(page === 'snippets')} onClick={() => onNavigate('snippets')}>
            <Lightbulb size={17} />
            洞察 Snippet
          </button>
          {activeDatasetId ? (
            <section className="mt-8 flex min-h-0 flex-1 flex-col">
              <h2 className="m-0 mb-2 px-3 text-xs font-normal text-muted">分析任务</h2>
              <div className="min-h-0 flex-1 overflow-y-auto">
                {conversations.map((conversation) => (
                  <ConversationItem
                    key={conversation.id}
                    conversation={conversation}
                    active={conversation.id === activeConversationId}
                    onSelect={() => onConversationSelect(conversation.id)}
                    onArchive={() => onConversationArchive(conversation.id)}
                  />
                ))}
                {!conversations.length && <p className="m-0 px-3 py-2 text-xs text-muted">暂无分析任务</p>}
              </div>
            </section>
          ) : (
            <div className="flex-1" />
          )}
          <button className={itemClass(page === 'settings')} onClick={() => onNavigate('settings')}>
            <GearSix size={17} />
            设置
          </button>
        </aside>
      </Panel>
      <ResizeHandle />
      <Panel id="workspace-content" minSize="50%" className="h-full min-h-0 min-w-0 flex-1">
        <main className="flex h-full min-w-0 flex-col bg-surface">
          <header className="flex h-9 shrink-0 items-center bg-page px-3 [-webkit-app-region:drag]">
            {datasetTabs.length ? (
              <div className="flex h-full items-center gap-1 overflow-x-auto [-webkit-app-region:no-drag]">
                {datasetTabs.map((dataset) => {
                  const active = activeDatasetId === dataset.id;
                  const { icon: SourceIcon } = getDatasetSource(dataset.sourceType);
                  return (
                    <div
                      key={dataset.id}
                      className={clsx(
                        'group relative flex h-8 min-w-28 max-w-52 flex-1 items-center rounded-md',
                        active && 'bg-surface text-ink',
                      )}
                    >
                      <button
                        type="button"
                        className={clsx(
                          'flex h-full min-w-0 flex-1 items-center gap-1.5 rounded-md px-3 pr-7 text-left text-xs [-webkit-app-region:no-drag]',
                          active ? 'bg-surface text-ink' : 'text-muted hover:bg-surface/60',
                        )}
                        onClick={() => onDatasetSelect(dataset.id)}
                      >
                        <SourceIcon size={14} className="shrink-0 text-[#25804d]" aria-hidden />
                        <span className="min-w-0 truncate">{dataset.name}</span>
                      </button>
                      <button
                        type="button"
                        aria-label={`关闭 ${dataset.name}`}
                        title={`关闭 ${dataset.name}`}
                        className={clsx(
                          'absolute right-1.5 top-1/2 grid size-5 -translate-y-1/2 place-items-center rounded text-muted transition-opacity [-webkit-app-region:no-drag] hover:bg-page hover:text-ink',
                          active
                            ? 'opacity-100'
                            : 'opacity-0 group-focus-within:opacity-100 group-hover:opacity-100',
                        )}
                        onClick={(event) => {
                          event.stopPropagation();
                          onDatasetClose(dataset.id);
                        }}
                      >
                        <X size={12} />
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <span className="text-xs text-muted">
                {page === 'settings'
                  ? '设置'
                  : page === 'snippets'
                    ? '洞察 Snippet'
                    : page === 'analysis'
                      ? '数据分析'
                      : '数据源'}
              </span>
            )}
          </header>
          <div className={clsx('min-h-0 flex-1', page === 'analysis' ? 'overflow-hidden' : 'overflow-auto')}>
            {children}
          </div>
        </main>
      </Panel>
    </Group>
  );
}
