import clsx from 'clsx';
import { PanelRightIcon } from 'lucide-react';
import { useEffect, useEffectEvent } from 'react';
import { Group, Panel, Separator } from 'react-resizable-panels';
import type { AnalysisFrameProps } from '../../components/AppShell';
import { IconButton, panelControlClassName } from '../../components/IconButton';
import { Chat } from '../../components/chat/chat';
import { ToolPreviewContext } from '../../components/chat/tool-preview';
import type { ToolPreviewTab } from '../../components/chat/tool-preview';
import { panelCollapsePreviewClassName, panelSeparatorClassName } from '../../lib/panel-layout';
import type { DatasetSummary, ModelProfile, Preferences } from '../../types';
import { AnalysisSidePanel } from './AnalysisSidePanel';
import { DATASET_PREVIEW_ID, MIN_ANALYSIS_PANEL_WIDTH, useAnalysisPreview } from './useAnalysisPreview';
import { useAnalysisTabs } from './useAnalysisTabs';
import { useFullscreenPreview } from './useFullscreenPreview';

const cardClassName =
  'flex h-full min-h-0 min-w-0 flex-col overflow-hidden rounded-[16px] motion-safe:transition-opacity motion-safe:duration-150';
const bodyClassName = 'min-h-0 min-w-0 flex-1 overflow-hidden';
const previewShortcut = 'Meta+Shift+B Control+Shift+B';

function useAnalysisShortcuts(fullscreen: boolean, exitFullscreen: () => void, togglePreview: () => void) {
  const handleKey = useEffectEvent((event: KeyboardEvent) => {
    if (event.defaultPrevented || event.repeat) return;

    if (fullscreen && event.key === 'Escape') {
      event.preventDefault();
      exitFullscreen();
    } else if (
      !fullscreen &&
      (event.metaKey || event.ctrlKey) &&
      event.shiftKey &&
      !event.altKey &&
      event.key.toLowerCase() === 'b'
    ) {
      event.preventDefault();
      togglePreview();
    }
  });

  useEffect(() => {
    const keydown = (event: KeyboardEvent) => handleKey(event);
    window.addEventListener('keydown', keydown);
    return () => window.removeEventListener('keydown', keydown);
  }, []);
}

type Props = AnalysisFrameProps & {
  dataset: Pick<DatasetSummary, 'id' | 'name' | 'sourceType'>;
  chatId: string;
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
  titleBar,
  fullscreen,
  onFullscreenChange,
  onPreviewOpen,
  chatId,
  conversationId,
  datasetCollapsed,
  onDatasetCollapsedChange,
  savedMessageIds,
  onConversationChange,
  models,
  activeModelId,
  preferences,
}: Props) {
  const preview = useAnalysisPreview({
    collapsed: datasetCollapsed,
    onCollapsedChange: onDatasetCollapsedChange,
    onOpen: onPreviewOpen,
  });
  const { card, changeFullscreen } = useFullscreenPreview(fullscreen, onFullscreenChange);

  const { activeTabId, tabs, selectTab, openDataset, openResult, closeTab } = useAnalysisTabs(chatId);

  const openSidePanel = () => {
    if (datasetCollapsed) preview.toggle();
  };

  const showResult = (tab: ToolPreviewTab) => {
    openResult(tab);
    openSidePanel();
  };

  const showDataset = () => {
    openDataset();
    openSidePanel();
  };

  useAnalysisShortcuts(fullscreen, () => changeFullscreen(false), preview.toggle);

  return (
    <Group
      orientation="horizontal"
      elementRef={preview.workspace}
      onPointerDownCapture={preview.collapsePreview.onPointerDownCapture}
      onLayoutChanged={preview.onLayoutChanged}
    >
      <Panel
        id="conversation"
        panelRef={preview.conversationPanel}
        defaultSize={preview.initialConversationWidth}
        minSize={MIN_ANALYSIS_PANEL_WIDTH}
        style={{ overflow: 'hidden' }}
      >
        <section className={clsx(cardClassName, 'bg-background')} aria-label="对话面板" inert={fullscreen}>
          <div className="relative top-(--workspace-titlebar-row-offset) flex h-(--workspace-titlebar-height) shrink-0 items-center gap-1 pe-[8px]">
            {!fullscreen && titleBar}
            {datasetCollapsed && !fullscreen && (
              <IconButton
                icon={PanelRightIcon}
                iconSize={18}
                label="展开右侧面板"
                className={panelControlClassName}
                aria-controls={DATASET_PREVIEW_ID}
                aria-expanded={false}
                aria-keyshortcuts={previewShortcut}
                onClick={preview.toggle}
              />
            )}
          </div>
          <div className={bodyClassName}>
            <ToolPreviewContext value={showResult}>
              <Chat
                datasetId={dataset.id}
                datasetName={dataset.name}
                onOpenDatasetPreview={showDataset}
                chatId={chatId}
                conversationId={conversationId}
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
      <Separator
        aria-label="调整对话与右侧面板宽度"
        className={clsx(panelSeparatorClassName, datasetCollapsed ? 'w-0' : 'w-(--workspace-gutter)')}
        disabled={datasetCollapsed || fullscreen}
        disableDoubleClick
        elementRef={preview.collapsePreview.separatorRef}
        onDoubleClick={preview.resetWidth}
      />
      <Panel
        id="analysis-preview-panel"
        panelRef={preview.previewPanel}
        elementRef={preview.collapsePreview.elementRef}
        onResize={preview.collapsePreview.onResize}
        defaultSize={preview.initialPreviewWidth}
        groupResizeBehavior="preserve-pixel-size"
        minSize={datasetCollapsed ? 0 : MIN_ANALYSIS_PANEL_WIDTH}
        maxSize={datasetCollapsed ? 0 : undefined}
        className={panelCollapsePreviewClassName}
        style={{ overflow: 'hidden' }}
      >
        <AnalysisSidePanel
          dataset={dataset}
          fullscreen={fullscreen}
          collapsed={datasetCollapsed}
          cardRef={card}
          tabs={tabs}
          activeTabId={activeTabId}
          previewShortcut={previewShortcut}
          onTabChange={selectTab}
          onTabClose={closeTab}
          onOpenDataset={showDataset}
          onToggleFullscreen={() => changeFullscreen(!fullscreen)}
          onCollapse={preview.toggle}
        />
      </Panel>
    </Group>
  );
}
