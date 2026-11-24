import clsx from 'clsx';
import { Maximize2Icon, Minimize2Icon, PanelRightIcon } from 'lucide-react';
import { useEffect, useEffectEvent } from 'react';
import type { ReactNode, RefObject } from 'react';
import type { AnalysisFrameProps } from '../../components/AppShell';
import { IconButton, panelControlClassName } from '../../components/IconButton';
import { ResizeHandle, panelCollapsePreviewClassName } from '../../components/ResizeHandle';
import { Chat } from '../../components/chat/chat';
import { panelMotionClassName } from '../../hooks/usePanelMotion';
import type { ModelProfile, Preferences } from '../../types';
import { DatasetPanel } from './DatasetPanel';
import { DATASET_PREVIEW_ID, useAnalysisPreview } from './useAnalysisPreview';
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

type DatasetPreviewPaneProps = {
  datasetId: string;
  titleBar: ReactNode;
  fullscreen: boolean;
  collapsed: boolean;
  collapsePending: boolean;
  cardRef: RefObject<HTMLElement | null>;
  onToggleFullscreen: () => void;
  onClose: () => void;
};

function DatasetPreviewPane({
  datasetId,
  titleBar,
  fullscreen,
  collapsed,
  collapsePending,
  cardRef,
  onToggleFullscreen,
  onClose,
}: DatasetPreviewPaneProps) {
  return (
    <section
      ref={cardRef}
      id={DATASET_PREVIEW_ID}
      className={clsx(
        cardClassName,
        'w-full justify-self-end bg-preview-surface',
        panelCollapsePreviewClassName,
        collapsed && !fullscreen && 'opacity-0',
        fullscreen ? 'fixed inset-y-0 right-0 z-40 rounded-none!' : 'relative z-10',
      )}
      role={fullscreen ? 'dialog' : undefined}
      aria-modal={fullscreen || undefined}
      aria-label="数据预览"
      inert={collapsed && !fullscreen}
      data-collapse-pending={(!fullscreen && collapsePending) || undefined}
    >
      <div
        className={clsx(
          'flex h-(--workspace-titlebar-height) shrink-0 items-center gap-1 pe-[8px]',
          !fullscreen && 'relative top-(--workspace-titlebar-row-offset) ps-4',
        )}
      >
        {fullscreen ? (
          titleBar
        ) : (
          <span className="flex h-full min-w-0 flex-1 items-center text-sm font-medium text-ink [-webkit-app-region:drag]">
            数据预览
          </span>
        )}
        <IconButton
          icon={fullscreen ? Minimize2Icon : Maximize2Icon}
          label={fullscreen ? '退出全屏预览' : '全屏预览'}
          title={fullscreen ? '退出全屏预览（Esc）' : '全屏预览'}
          className={panelControlClassName}
          aria-pressed={fullscreen}
          onClick={onToggleFullscreen}
        />
        {!collapsed && !fullscreen && (
          <IconButton
            icon={PanelRightIcon}
            iconSize={18}
            label="收起数据预览"
            className={panelControlClassName}
            aria-controls={DATASET_PREVIEW_ID}
            aria-expanded
            aria-keyshortcuts={previewShortcut}
            onClick={onClose}
          />
        )}
      </div>
      <div className={bodyClassName}>
        <DatasetPanel key={datasetId} datasetId={datasetId} />
      </div>
    </section>
  );
}

type Props = AnalysisFrameProps & {
  datasetId: string;
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
  datasetId,
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
              label="展开数据预览"
              className={panelControlClassName}
              aria-controls={DATASET_PREVIEW_ID}
              aria-expanded={false}
              aria-keyshortcuts={previewShortcut}
              onClick={preview.toggle}
            />
          )}
        </div>
        <div className={bodyClassName}>
          <Chat
            datasetId={datasetId}
            chatId={chatId}
            conversationId={conversationId}
            savedMessageIds={savedMessageIds}
            onConversationChange={onConversationChange}
            models={models}
            activeModelId={activeModelId}
            preferences={preferences}
          />
        </div>
      </section>
      {!datasetCollapsed && !fullscreen ? (
        <ResizeHandle label="调整对话与数据预览宽度" controls="conversation" {...preview.resizeHandle} />
      ) : (
        <div aria-hidden />
      )}
      <DatasetPreviewPane
        datasetId={datasetId}
        titleBar={titleBar}
        fullscreen={fullscreen}
        collapsed={datasetCollapsed}
        collapsePending={preview.collapsePending}
        cardRef={card}
        onToggleFullscreen={() => setPreviewFullscreen(!fullscreen)}
        onClose={preview.toggle}
      />
    </div>
  );
}
