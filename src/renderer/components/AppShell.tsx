import { X } from '@phosphor-icons/react';
import clsx from 'clsx';
import { useState } from 'react';
import type { PropsWithChildren } from 'react';
import { Group, Panel, usePanelRef } from 'react-resizable-panels';
import { readWidth, saveWidth } from '../utils';
import type { DatasetSummary } from '../types';
import { DataSourceLogo } from './DataSourceLogo';
import { ResizeHandle } from './ResizeHandle';
import { WorkspaceSidebar } from './WorkspaceSidebar';
import type { WorkspaceSidebarProps } from './WorkspaceSidebar';

type AppShellProps = PropsWithChildren<
  WorkspaceSidebarProps & {
    datasetTabs: DatasetSummary[];
    onDatasetSelect: (id: string) => void;
    onDatasetClose: (id: string) => void;
  }
>;

const SIDEBAR_MIN_WIDTH = 160;
const SIDEBAR_COLLAPSED_WIDTH = 52;

export function AppShell({
  page,
  datasetTabs,
  activeDatasetId,
  onDatasetSelect,
  onDatasetClose,
  children,
  ...sidebar
}: AppShellProps) {
  const [sidebarWidth] = useState(() => Math.max(SIDEBAR_MIN_WIDTH, readWidth('sive.sidebar-width', 224)));
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const sidebarPanel = usePanelRef();

  const toggleSidebar = () => {
    if (sidebarCollapsed) sidebarPanel.current?.expand();
    else sidebarPanel.current?.collapse();
  };

  return (
    <Group orientation="horizontal" className="h-screen overflow-hidden bg-page">
      <Panel
        id="app-sidebar"
        panelRef={sidebarPanel}
        defaultSize={sidebarWidth}
        minSize={SIDEBAR_MIN_WIDTH}
        maxSize={280}
        collapsible
        collapsedSize={SIDEBAR_COLLAPSED_WIDTH}
        groupResizeBehavior="preserve-pixel-size"
        className="h-full min-h-0"
        onResize={({ inPixels }) => {
          const collapsed = inPixels < SIDEBAR_MIN_WIDTH;
          setSidebarCollapsed(collapsed);
          if (!collapsed) saveWidth('sive.sidebar-width', inPixels);
        }}
      >
        <WorkspaceSidebar
          {...sidebar}
          page={page}
          activeDatasetId={activeDatasetId}
          collapsed={sidebarCollapsed}
          onToggle={toggleSidebar}
        />
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
                          'flex h-full min-w-0 flex-1 items-center gap-1.5 rounded-md px-3 pr-7 text-left text-sm [-webkit-app-region:no-drag]',
                          active ? 'bg-surface text-ink' : 'text-muted-foreground hover:bg-surface/60',
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
                          'absolute right-1.5 top-1/2 grid size-5 -translate-y-1/2 place-items-center rounded text-muted-foreground transition-opacity [-webkit-app-region:no-drag] hover:bg-page hover:text-ink',
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
              <span className="text-xs text-muted-foreground">
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
