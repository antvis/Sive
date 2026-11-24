import clsx from 'clsx';
import { useEffect, useState } from 'react';
import type { PropsWithChildren, ReactNode } from 'react';
import { panelMotionClassName, usePanelMotion } from '../hooks/usePanelMotion';
import { clampPanelWidth, usePanelResize } from '../hooks/usePanelResize';
import { usePanelToggleFocus } from '../hooks/usePanelToggleFocus';
import { readWidth, saveWidth } from '../utils';
import type { DatasetSummary } from '../types';
import { ConversationSwitcher } from './ConversationSwitcher';
import { ResizeHandle } from './ResizeHandle';
import { WORKSPACE_SIDEBAR_ID, WorkspaceSidebar } from './WorkspaceSidebar';
import type { WorkspaceSidebarProps } from './WorkspaceSidebar';
import { WorkspaceTitleBar } from './WorkspaceTitleBar';

type AppShellProps = PropsWithChildren<
  WorkspaceSidebarProps & {
    datasetTabs: DatasetSummary[];
    onDatasetSelect: (id: string) => void;
    onDatasetClose: (id: string) => void;
    renderAnalysis?: (frame: AnalysisFrameProps) => ReactNode;
  }
>;

export type AnalysisFrameProps = {
  titleBar: ReactNode;
  fullscreen: boolean;
  onFullscreenChange: (fullscreen: boolean) => void;
  onPreviewOpen: () => void;
};

const SIDEBAR_MIN_WIDTH = 160;
const SIDEBAR_MAX_WIDTH = 280;
const SIDEBAR_DEFAULT_WIDTH = 224;

export function AppShell({
  page,
  datasetTabs,
  activeDatasetId,
  onDatasetSelect,
  onDatasetClose,
  renderAnalysis,
  children,
  ...sidebar
}: AppShellProps) {
  const [sidebarWidth, setSidebarWidth] = useState(() =>
    clampPanelWidth(
      readWidth('sive.sidebar-width', SIDEBAR_DEFAULT_WIDTH),
      SIDEBAR_MIN_WIDTH,
      SIDEBAR_MAX_WIDTH,
    ),
  );
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const { element: workspace, startMotion, stopMotion } = usePanelMotion();
  const rememberSidebarToggleFocus = usePanelToggleFocus(workspace, WORKSPACE_SIDEBAR_ID, sidebarCollapsed);
  const hasAnalysis = Boolean(renderAnalysis);
  const previewFullscreen = hasAnalysis && fullscreen;
  const showSidebarActions = sidebarCollapsed && !previewFullscreen;

  useEffect(() => {
    if (!hasAnalysis) setFullscreen(false);
  }, [hasAnalysis]);

  const changeSidebarCollapsed = (collapsed: boolean) => {
    sidebarResize.cancelResize();
    rememberSidebarToggleFocus();
    startMotion();
    setSidebarCollapsed(collapsed);
  };

  const openSidebar = () => changeSidebarCollapsed(false);

  const closeSidebar = () => changeSidebarCollapsed(true);

  const saveSidebarWidth = (width: number) => {
    stopMotion();
    setSidebarWidth(width);
    saveWidth('sive.sidebar-width', width);
  };

  const sidebarResize = usePanelResize({
    width: sidebarWidth,
    minWidth: SIDEBAR_MIN_WIDTH,
    maxWidth: SIDEBAR_MAX_WIDTH,
    collapseAt: 'min',
    onStart: stopMotion,
    onResize: saveSidebarWidth,
    onCollapse: closeSidebar,
  });

  const handlePreviewOpen = () => {
    if (!sidebarCollapsed) closeSidebar();
  };

  const changeFullscreen = (value: boolean) => {
    sidebarResize.cancelResize();
    setFullscreen(value);
  };

  const titleBar = (
    <WorkspaceTitleBar
      page={page}
      datasets={sidebar.datasets}
      tabs={datasetTabs}
      activeDatasetId={activeDatasetId}
      showSidebarActions={showSidebarActions}
      fullscreen={previewFullscreen}
      conversationTitle={
        hasAnalysis && !previewFullscreen ? (
          <ConversationSwitcher
            datasets={sidebar.datasets}
            conversationsByDataset={sidebar.conversationsByDataset}
            activeDatasetId={activeDatasetId}
            activeConversationId={sidebar.activeConversationId}
            onConversationSelect={sidebar.onConversationSelect}
          />
        ) : undefined
      }
      onOpenSidebar={openSidebar}
      onConversationCreate={sidebar.onConversationCreate}
      onDatasetSelect={onDatasetSelect}
      onDatasetClose={onDatasetClose}
    />
  );

  return (
    <div className="h-screen overflow-hidden bg-workspace-canvas p-(--workspace-gutter)">
      <div
        ref={workspace}
        className={clsx('grid h-full overflow-hidden', panelMotionClassName)}
        style={{
          gridTemplateColumns: sidebarCollapsed
            ? '0px 0px minmax(0,1fr)'
            : `${sidebarResize.width}px var(--workspace-gutter) minmax(0,1fr)`,
        }}
      >
        <div id="app-sidebar" className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden">
          <WorkspaceSidebar
            {...sidebar}
            page={page}
            activeDatasetId={activeDatasetId}
            inert={previewFullscreen || sidebarCollapsed}
            collapsePending={sidebarResize.collapsePending}
            onCollapse={closeSidebar}
          />
        </div>
        {!previewFullscreen && !sidebarCollapsed ? (
          <ResizeHandle
            label="调整侧边栏宽度"
            controls={WORKSPACE_SIDEBAR_ID}
            width={sidebarResize.width}
            minWidth={SIDEBAR_MIN_WIDTH}
            maxWidth={SIDEBAR_MAX_WIDTH}
            defaultWidth={SIDEBAR_DEFAULT_WIDTH}
            dragging={sidebarResize.dragging}
            onPointerDown={sidebarResize.startResize}
            onLostPointerCapture={sidebarResize.cancelResize}
            onResize={sidebarResize.resizeTo}
          />
        ) : (
          <div aria-hidden />
        )}
        <div id="workspace-content" className="h-full min-h-0 min-w-0 overflow-hidden">
          {renderAnalysis ? (
            <>
              {renderAnalysis({
                titleBar,
                fullscreen: previewFullscreen,
                onPreviewOpen: handlePreviewOpen,
                onFullscreenChange: changeFullscreen,
              })}
              {children}
            </>
          ) : (
            <main className="flex h-full min-w-0 flex-col overflow-hidden rounded-[16px] bg-surface">
              <div className="relative top-(--workspace-titlebar-row-offset) flex shrink-0">{titleBar}</div>
              <div className="min-h-0 flex-1 overflow-auto">{children}</div>
            </main>
          )}
        </div>
      </div>
    </div>
  );
}
