import clsx from 'clsx';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { PropsWithChildren, ReactNode } from 'react';
import { Group, Panel, Separator, usePanelRef } from 'react-resizable-panels';
import { usePanelToggleFocus } from '../hooks/usePanelToggleFocus';
import { usePanelCollapsePreview } from '../hooks/usePanelCollapsePreview';
import { readWidth, saveWidth } from '../utils';
import { panelCollapsePreviewClassName, panelSeparatorClassName } from '../lib/panel-layout';
import { ConversationSwitcher } from './ConversationSwitcher';
import { WORKSPACE_SIDEBAR_ID, WorkspaceSidebar } from './WorkspaceSidebar';
import type { WorkspaceSidebarProps } from './WorkspaceSidebar';
import { WorkspaceTitleBar } from './WorkspaceTitleBar';

type AppShellProps = PropsWithChildren<
  WorkspaceSidebarProps & {
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
const SIDEBAR_MAX_WIDTH = 320;
const SIDEBAR_DEFAULT_WIDTH = 224;
const SIDEBAR_WIDTH_KEY = 'sive.sidebar-width';

export function AppShell({
  page,
  activeDatasetId,
  renderAnalysis,
  children,
  ...sidebar
}: AppShellProps) {
  const [initialSidebarWidth] = useState(() => readWidth(SIDEBAR_WIDTH_KEY, SIDEBAR_DEFAULT_WIDTH));
  const preferredSidebarWidth = useRef(initialSidebarWidth);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const workspace = useRef<HTMLDivElement>(null);
  const sidebarPanel = usePanelRef();
  const rememberSidebarToggleFocus = usePanelToggleFocus(workspace, WORKSPACE_SIDEBAR_ID, sidebarCollapsed);
  const hasAnalysis = Boolean(renderAnalysis);
  const previewFullscreen = hasAnalysis && fullscreen;
  const showSidebarActions = sidebarCollapsed && !previewFullscreen;

  useEffect(() => {
    if (!hasAnalysis) setFullscreen(false);
  }, [hasAnalysis]);

  useLayoutEffect(() => {
    if (sidebarCollapsed) return;

    const frame = requestAnimationFrame(() => sidebarPanel.current?.resize(preferredSidebarWidth.current));
    return () => cancelAnimationFrame(frame);
  }, [sidebarCollapsed, sidebarPanel]);

  const changeSidebarCollapsed = (collapsed: boolean) => {
    if (collapsed === sidebarCollapsed) return;
    rememberSidebarToggleFocus();
    setSidebarCollapsed(collapsed);
  };

  const openSidebar = () => changeSidebarCollapsed(false);

  const closeSidebar = () => changeSidebarCollapsed(true);
  const sidebarCollapse = usePanelCollapsePreview(sidebarPanel, SIDEBAR_MIN_WIDTH, closeSidebar);

  const handlePreviewOpen = () => {
    if (!sidebarCollapsed) closeSidebar();
  };

  const titleBar = (
    <WorkspaceTitleBar
      page={page}
      datasets={sidebar.datasets}
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
    />
  );

  return (
    <div className="h-screen overflow-hidden bg-workspace-canvas p-(--workspace-gutter)">
      <Group
        orientation="horizontal"
        elementRef={workspace}
        onPointerDownCapture={sidebarCollapse.onPointerDownCapture}
        onLayoutChanged={(_, { isUserInteraction }) => {
          if (!isUserInteraction || sidebarCollapse.shouldCollapse()) return;

          requestAnimationFrame(() => {
            const panel = sidebarPanel.current;
            if (!panel) return;
            preferredSidebarWidth.current = panel.getSize().inPixels;
            saveWidth(SIDEBAR_WIDTH_KEY, preferredSidebarWidth.current);
          });
        }}
      >
        <Panel
          id="app-sidebar"
          panelRef={sidebarPanel}
          elementRef={sidebarCollapse.elementRef}
          onResize={sidebarCollapse.onResize}
          defaultSize={initialSidebarWidth}
          minSize={sidebarCollapsed ? 0 : SIDEBAR_MIN_WIDTH}
          maxSize={sidebarCollapsed ? 0 : SIDEBAR_MAX_WIDTH}
          groupResizeBehavior="preserve-pixel-size"
          className={clsx('flex min-w-0 flex-col', panelCollapsePreviewClassName)}
          style={{ overflow: 'hidden' }}
        >
          <WorkspaceSidebar
            {...sidebar}
            page={page}
            activeDatasetId={activeDatasetId}
            inert={previewFullscreen || sidebarCollapsed}
            onCollapse={closeSidebar}
          />
        </Panel>
        <Separator
          aria-label="调整侧边栏宽度"
          className={clsx(panelSeparatorClassName, sidebarCollapsed ? 'w-0' : 'w-(--workspace-gutter)')}
          disabled={previewFullscreen || sidebarCollapsed}
          disableDoubleClick
          elementRef={sidebarCollapse.separatorRef}
          onDoubleClick={() => {
            sidebarPanel.current?.resize(SIDEBAR_DEFAULT_WIDTH);
            preferredSidebarWidth.current = SIDEBAR_DEFAULT_WIDTH;
            saveWidth(SIDEBAR_WIDTH_KEY, SIDEBAR_DEFAULT_WIDTH);
          }}
        />
        <Panel id="workspace-content" style={{ overflow: 'hidden' }}>
          {renderAnalysis ? (
            <>
              {renderAnalysis({
                titleBar,
                fullscreen: previewFullscreen,
                onPreviewOpen: handlePreviewOpen,
                onFullscreenChange: setFullscreen,
              })}
              {children}
            </>
          ) : (
            <main className="flex h-full min-w-0 flex-col overflow-hidden rounded-[16px] bg-surface">
              <div className="relative top-(--workspace-titlebar-row-offset) flex shrink-0">{titleBar}</div>
              <div className="min-h-0 flex-1 overflow-auto">{children}</div>
            </main>
          )}
        </Panel>
      </Group>
    </div>
  );
}
