import { Archive, Database, GearSix, Lightbulb, PencilSimple, Plus, X } from '@phosphor-icons/react';
import clsx from 'clsx';
import { useRef, useState } from 'react';
import type { PropsWithChildren } from 'react';
import { Group, Panel } from 'react-resizable-panels';
import { NavLink, useMatch } from 'react-router';
import { toast } from 'sonner';
import { analysisPath, routePaths } from '../router/paths';
import { errorMessage, readWidth, saveWidth } from '../utils';
import { DataSourceLogo } from './DataSourceLogo';
import type { Conversation, DatasetSummary } from '../types';
import { IconButton } from './IconButton';
import { ResizeHandle } from './ResizeHandle';

type AppShellProps = PropsWithChildren<{
  datasetTabs: DatasetSummary[];
  activeDatasetId: string | null;
  conversations: Conversation[];
  onDatasetSelect: (id: string) => void;
  onDatasetClose: (id: string) => void;
  onConversationCreate: () => void;
}>;

const itemClass = (active: boolean) =>
  clsx(
    'flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left [font:inherit]',
    active ? 'bg-accent-soft text-accent' : 'text-muted hover:bg-surface hover:text-ink',
  );

function ConversationItem({ conversation }: { conversation: Conversation }) {
  const path = analysisPath(conversation.datasetId, conversation.id);
  const active = Boolean(useMatch(path));
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
        <NavLink
          to={path}
          end
          title={conversation.title}
          className="min-w-0 flex-1 px-3 py-2 text-left [font:inherit]"
        >
          <span className="block truncate">{conversation.title}</span>
          <time className="mt-1 block text-xs text-muted" dateTime={conversation.updatedAt}>
            {new Date(conversation.updatedAt).toLocaleString('zh-CN')}
          </time>
        </NavLink>
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
  datasetTabs,
  activeDatasetId,
  conversations,
  onDatasetSelect,
  onDatasetClose,
  onConversationCreate,
  children,
}: AppShellProps) {
  const [sidebarWidth] = useState(() => readWidth('sive.sidebar-width', 210));
  const isAnalysis = Boolean(useMatch(routePaths.analysis));
  const isSettings = Boolean(useMatch(routePaths.settings));
  const isSnippets = Boolean(useMatch(routePaths.snippets));
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
          <NavLink to={routePaths.datasets} className={({ isActive }) => itemClass(isActive)}>
            <Database size={17} />
            数据源
          </NavLink>
          <NavLink to={routePaths.snippets} end className={({ isActive }) => itemClass(isActive)}>
            <Lightbulb size={17} />
            洞察 Snippet
          </NavLink>
          {activeDatasetId ? (
            <section className="mt-8 flex min-h-0 flex-1 flex-col">
              <h2 className="m-0 mb-2 px-3 text-xs font-normal text-muted">分析任务</h2>
              <div className="min-h-0 flex-1 overflow-y-auto">
                {conversations.map((conversation) => (
                  <ConversationItem key={conversation.id} conversation={conversation} />
                ))}
                {!conversations.length && <p className="m-0 px-3 py-2 text-xs text-muted">暂无分析任务</p>}
              </div>
            </section>
          ) : (
            <div className="flex-1" />
          )}
          <NavLink to={routePaths.settings} end className={({ isActive }) => itemClass(isActive)}>
            <GearSix size={17} />
            设置
          </NavLink>
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
                        <DataSourceLogo type={dataset.sourceType} size={14} />
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
                {isSettings ? '设置' : isSnippets ? '洞察 Snippet' : isAnalysis ? '数据分析' : '数据源'}
              </span>
            )}
          </header>
          <div className={clsx('min-h-0 flex-1', isAnalysis ? 'overflow-hidden' : 'overflow-auto')}>
            {children}
          </div>
        </main>
      </Panel>
    </Group>
  );
}
