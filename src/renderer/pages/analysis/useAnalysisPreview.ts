import { useLayoutEffect, useState } from 'react';
import { usePanelMotion } from '../../hooks/usePanelMotion';
import { clampPanelWidth, usePanelResize } from '../../hooks/usePanelResize';
import { usePanelToggleFocus } from '../../hooks/usePanelToggleFocus';
import { readWidth, saveWidth } from '../../utils';

export const DATASET_PREVIEW_ID = 'dataset';

const GAP_WIDTH = 8;
const MIN_PANE_WIDTH = 280;
const DEFAULT_CONVERSATION_WIDTH = 380;
const CONVERSATION_WIDTH_KEY = 'sive.conversation-width';

function getPreviewGridColumns(collapsed: boolean, preferredChatWidth: number) {
  if (collapsed) return 'minmax(0,1fr) 0px 0px';

  // Relative tracks follow the sidebar's changing width during simultaneous transitions.
  const half = `calc(50% - ${GAP_WIDTH / 2}px)`;
  const minimum = `min(${MIN_PANE_WIDTH}px, ${half})`;
  const preferred = `calc(100% - ${preferredChatWidth + GAP_WIDTH}px)`;
  const maximum = `max(${half}, calc(100% - ${MIN_PANE_WIDTH + GAP_WIDTH}px))`;
  return `minmax(0,1fr) ${GAP_WIDTH}px clamp(${minimum}, ${preferred}, ${maximum})`;
}

type Options = {
  collapsed: boolean;
  onCollapsedChange: (collapsed: boolean) => void;
  onOpen: () => void;
};

export function useAnalysisPreview({ collapsed, onCollapsedChange, onOpen }: Options) {
  const [conversationWidth, setConversationWidth] = useState(() =>
    readWidth(CONVERSATION_WIDTH_KEY, DEFAULT_CONVERSATION_WIDTH),
  );
  const [workspaceWidth, setWorkspaceWidth] = useState(0);
  const { element: workspace, startMotion, stopMotion } = usePanelMotion();
  const rememberToggleFocus = usePanelToggleFocus(workspace, DATASET_PREVIEW_ID, collapsed);

  useLayoutEffect(() => {
    const element = workspace.current;
    if (!element) return;

    setWorkspaceWidth(element.getBoundingClientRect().width);
    const observer = new ResizeObserver(([entry]) => setWorkspaceWidth(entry.contentRect.width));
    observer.observe(element);
    return () => observer.disconnect();
  }, [workspace]);

  const available = Math.max(0, workspaceWidth - (collapsed ? 0 : GAP_WIDTH));
  const minWidth = Math.min(MIN_PANE_WIDTH, available / 2);
  const maxWidth = available - minWidth;

  const saveConversationWidth = (width: number) => {
    stopMotion();
    setConversationWidth(width);
    saveWidth(CONVERSATION_WIDTH_KEY, width);
  };

  const changeCollapsed = (next: boolean) => {
    resize.cancelResize();
    startMotion();
    rememberToggleFocus();
    if (!next) onOpen();
    onCollapsedChange(next);
  };

  const resize = usePanelResize({
    width: clampPanelWidth(conversationWidth, minWidth, maxWidth),
    minWidth,
    maxWidth,
    collapseAt: 'max',
    onStart: stopMotion,
    onResize: saveConversationWidth,
    onCollapse: () => changeCollapsed(true),
  });

  return {
    workspace,
    gridTemplateColumns: getPreviewGridColumns(collapsed, resize.dragging ? resize.width : conversationWidth),
    collapsePending: resize.collapsePending,
    cancelResize: resize.cancelResize,
    toggle: () => changeCollapsed(!collapsed),
    resizeHandle: {
      width: clampPanelWidth(resize.width, minWidth, maxWidth),
      minWidth,
      maxWidth,
      defaultWidth: DEFAULT_CONVERSATION_WIDTH,
      dragging: resize.dragging,
      onPointerDown: resize.startResize,
      onLostPointerCapture: resize.cancelResize,
      onResize: resize.resizeTo,
    },
  };
}
