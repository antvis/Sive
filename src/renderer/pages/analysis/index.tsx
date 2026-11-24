import clsx from 'clsx';
import { PanelRightIcon } from 'lucide-react';
import { useEffect, useEffectEvent } from 'react';
import type { AnalysisFrameProps } from '../../components/AppShell';
import { IconButton, panelControlClassName } from '../../components/IconButton';
import { ResizeHandle } from '../../components/ResizeHandle';
import { Chat } from '../../components/chat/chat';
import { ToolPreviewContext } from '../../components/chat/tool-preview';
import type { ToolPreviewTab } from '../../components/chat/tool-preview';
import { panelMotionClassName } from '../../hooks/usePanelMotion';
import type { DatasetSummary, ModelProfile, Preferences } from '../../types';
import { AnalysisSidePanel } from './AnalysisSidePanel';
import { DATASET_PREVIEW_ID, useAnalysisPreview } from './useAnalysisPreview';
import { DATASET_PREVIEW_TAB, useAnalysisTabs } from './useAnalysisTabs';
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
  const { activeTabId, tabs, selectTab, openTab, closeTab } = useAnalysisTabs(chatId);

  const openSidePanel = () => {
    if (datasetCollapsed) preview.toggle();
  };

  const openResult = (tab: ToolPreviewTab) => {
    openTab(tab);
    openSidePanel();
  };

  const setPreviewFullscreen = (value: boolean) => {
    preview.cancelResize();
    changeFullscreen(value);
  };

  useAnalysisShortcuts(fullscreen, () => setPreviewFullscreen(false), preview.toggle);

  return (
    <div
      ref={preview.workspace}
      className={clsx('grid h-full min-h-0 min-w-0 grid-rows-1', panelMotionClassName)}
      style={{ gridTemplateColumns: preview.gridTemplateColumns }}
    >
      <section
        id="conversation"
        className={clsx(cardClassName, 'chat-theme bg-background')}
        aria-label="对话面板"
        inert={fullscreen}
      >
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
          <ToolPreviewContext value={openResult}>
            <Chat
              datasetId={dataset.id}
              datasetName={dataset.name}
              onOpenDatasetPreview={() => {
                selectTab(DATASET_PREVIEW_TAB);
                openSidePanel();
              }}
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
      {!datasetCollapsed && !fullscreen ? (
        <ResizeHandle label="调整对话与右侧面板宽度" controls="conversation" {...preview.resizeHandle} />
      ) : (
        <div aria-hidden />
      )}
      <AnalysisSidePanel
        dataset={dataset}
        titleBar={titleBar}
        fullscreen={fullscreen}
        collapsed={datasetCollapsed}
        collapsePending={preview.collapsePending}
        cardRef={card}
        tabs={tabs}
        activeTabId={activeTabId}
        previewShortcut={previewShortcut}
        onTabChange={selectTab}
        onTabClose={closeTab}
        onToggleFullscreen={() => setPreviewFullscreen(!fullscreen)}
        onCollapse={preview.toggle}
      />
    </div>
  );
}
