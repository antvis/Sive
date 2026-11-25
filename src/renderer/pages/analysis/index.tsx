import { PanelRightIcon } from 'lucide-react';
import { useLayoutEffect, useRef, useState } from 'react';
import { Group, Panel, usePanelRef } from 'react-resizable-panels';
import type { AnalysisFrameProps } from '../../components/AppShell';
import { Chat } from '../../components/chat/chat';
import { ToolPreviewContext } from '../../components/chat/tool-preview';
import type { ToolPreviewTab } from '../../components/chat/tool-preview';
import { Button } from '../../components/ui/button';
import { usePanelCollapsePreview } from '../../hooks/usePanelCollapsePreview';
import { usePanelToggleFocus } from '../../hooks/usePanelToggleFocus';
import { ResizeHandle } from '../../components/ui/resize-handle';
import type { DatasetSummary, ModelProfile, Preferences } from '../../types';
import { readWidth, saveWidth } from '../../utils';
import { AnalysisSidePanel, DATASET_PREVIEW_ID } from './AnalysisSidePanel';
import { useAnalysisTabs } from './useAnalysisTabs';

const MIN_ANALYSIS_PANEL_WIDTH = 240;
const DEFAULT_CONVERSATION_WIDTH = 380;
const CONVERSATION_WIDTH_KEY = 'sive.conversation-width';
const PREVIEW_WIDTH_KEY = 'sive.preview-width';

type Props = AnalysisFrameProps & {
  dataset: Pick<DatasetSummary, 'id' | 'name' | 'sourceType'>;
  datasets: DatasetSummary[];
  onDatasetChange: (datasetId: string) => void;
  chatId: string;
  draftId: string;
  conversationId: string | null;
  datasetCollapsed: boolean;
  onDatasetCollapsedChange: (collapsed: boolean) => void;
  savedMessageIds: string[];
  onConversationChange: (id: string) => void;
  models: ModelProfile[];
  activeModelId: string;
  preferences: Preferences;
};

export function AnalysisPage({
  dataset,
  datasets,
  onDatasetChange,
  titleBar,
  fullscreen,
  onFullscreenChange,
  onPreviewOpen,
  chatId,
  draftId,
  conversationId,
  datasetCollapsed,
  onDatasetCollapsedChange,
  savedMessageIds,
  onConversationChange,
  models,
  activeModelId,
  preferences,
}: Props) {
  const [initialPreviewWidth] = useState(() => readWidth(PREVIEW_WIDTH_KEY, 0) || undefined);
  const [initialConversationWidth] = useState(() =>
    initialPreviewWidth ? undefined : readWidth(CONVERSATION_WIDTH_KEY, DEFAULT_CONVERSATION_WIDTH),
  );
  const preferredPreviewWidth = useRef(initialPreviewWidth);
  const workspace = useRef<HTMLDivElement>(null);
  const conversationPanel = usePanelRef();
  const previewPanel = usePanelRef();
  const rememberToggleFocus = usePanelToggleFocus(workspace, DATASET_PREVIEW_ID, datasetCollapsed);
  const { activeTabId, tabs, selectTab, openDataset, openResult, closeTab } = useAnalysisTabs(chatId);

  const changePreviewCollapsed = (collapsed: boolean, restoreFocus = false) => {
    rememberToggleFocus(restoreFocus);
    if (!collapsed) onPreviewOpen();
    onDatasetCollapsedChange(collapsed);
  };

  const collapsePreview = usePanelCollapsePreview(previewPanel, MIN_ANALYSIS_PANEL_WIDTH, () => {
    changePreviewCollapsed(true);
  });

  useLayoutEffect(() => {
    if (datasetCollapsed) return;

    const frame = requestAnimationFrame(() => {
      const panel = previewPanel.current;
      if (!panel) return;

      if (preferredPreviewWidth.current) panel.resize(preferredPreviewWidth.current);
      else preferredPreviewWidth.current = panel.getSize().inPixels;
    });
    return () => cancelAnimationFrame(frame);
  }, [datasetCollapsed, previewPanel]);

  const persistPreviewWidth = () => {
    requestAnimationFrame(() => {
      const width = previewPanel.current?.getSize().inPixels;
      if (!width) return;

      preferredPreviewWidth.current = width;
      saveWidth(PREVIEW_WIDTH_KEY, width);
    });
  };

  const togglePreview = () => {
    if (datasetCollapsed && !tabs.length) openDataset();
    changePreviewCollapsed(!datasetCollapsed);
  };

  const closePreviewTab = (id: string) => {
    closeTab(id);
    if (tabs.length !== 1 || tabs[0].id !== id) return;
    if (fullscreen) onFullscreenChange(false);
    changePreviewCollapsed(true, true);
  };

  const openSidePanel = () => {
    if (datasetCollapsed) changePreviewCollapsed(false);
  };

  const showResult = (tab: ToolPreviewTab) => {
    openResult(tab);
    openSidePanel();
  };

  const showDataset = () => {
    openDataset();
    openSidePanel();
  };

  const toolbar = !fullscreen && (
    <>
      {titleBar}
      {datasetCollapsed && (
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="展开右侧面板"
          title="展开右侧面板"
          className="rounded-full text-muted-foreground"
          aria-controls={DATASET_PREVIEW_ID}
          aria-expanded={false}
          aria-keyshortcuts="Meta+Shift+B Control+Shift+B"
          onClick={togglePreview}
        >
          <PanelRightIcon className="size-[16px]" aria-hidden />
        </Button>
      )}
    </>
  );

  return (
    <Group
      orientation="horizontal"
      elementRef={workspace}
      onPointerDownCapture={collapsePreview.onPointerDownCapture}
      onLayoutChanged={(_, { isUserInteraction }) => {
        if (!isUserInteraction || datasetCollapsed || collapsePreview.shouldCollapse()) return;
        persistPreviewWidth();
      }}
    >
      <Panel
        id="conversation"
        panelRef={conversationPanel}
        defaultSize={initialConversationWidth}
        minSize={MIN_ANALYSIS_PANEL_WIDTH}
        style={{ overflow: 'hidden' }}
      >
        <section
          className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden rounded-2xl bg-background motion-safe:transition-opacity motion-safe:duration-150"
          aria-label="对话面板"
          inert={fullscreen}
        >
          <div className="min-h-0 min-w-0 flex-1 overflow-hidden">
            <ToolPreviewContext value={showResult}>
              <Chat
                key={draftId}
                dataset={dataset}
                datasets={datasets}
                onDatasetChange={(id) => {
                  onDatasetChange(id);
                  showDataset();
                }}
                onOpenDatasetPreview={showDataset}
                toolbar={toolbar}
                chatId={chatId}
                conversationId={conversationId}
                visible={!fullscreen}
                savedMessageIds={savedMessageIds}
                onConversationChange={onConversationChange}
                models={models}
                activeModelId={activeModelId}
                preferences={preferences}
              />
            </ToolPreviewContext>
          </div>
        </section>
      </Panel>
      <ResizeHandle
        aria-label="调整对话与右侧面板宽度"
        className={datasetCollapsed ? 'w-0' : undefined}
        disabled={datasetCollapsed || fullscreen}
        disableDoubleClick
        elementRef={collapsePreview.separatorRef}
        onDoubleClick={() => {
          conversationPanel.current?.resize(DEFAULT_CONVERSATION_WIDTH);
          persistPreviewWidth();
        }}
      />
      <Panel
        id="analysis-preview-panel"
        panelRef={previewPanel}
        elementRef={collapsePreview.elementRef}
        onResize={collapsePreview.onResize}
        defaultSize={initialPreviewWidth}
        groupResizeBehavior="preserve-pixel-size"
        minSize={datasetCollapsed ? 0 : MIN_ANALYSIS_PANEL_WIDTH}
        maxSize={datasetCollapsed ? 0 : undefined}
        className={
          '[[data-collapse-preview]>&]:blur-[3px] motion-safe:transition-[filter] motion-safe:duration-150'
        }
        style={{ overflow: 'hidden' }}
      >
        <AnalysisSidePanel
          dataset={dataset}
          fullscreen={fullscreen}
          collapsed={datasetCollapsed}
          tabs={tabs}
          activeTabId={activeTabId}
          onTabChange={selectTab}
          onTabClose={closePreviewTab}
          onOpenDataset={showDataset}
          onFullscreenChange={onFullscreenChange}
          onToggleCollapsed={togglePreview}
        />
      </Panel>
    </Group>
  );
}
