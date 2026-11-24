import { useLayoutEffect, useRef, useState } from 'react';
import { usePanelRef } from 'react-resizable-panels';
import type { Layout, LayoutChangedMeta } from 'react-resizable-panels';
import { usePanelCollapsePreview } from '../../hooks/usePanelCollapsePreview';
import { usePanelToggleFocus } from '../../hooks/usePanelToggleFocus';
import { readWidth, saveWidth } from '../../utils';

export const DATASET_PREVIEW_ID = 'dataset';

export const MIN_ANALYSIS_PANEL_WIDTH = 240;

const DEFAULT_CONVERSATION_WIDTH = 380;
const CONVERSATION_WIDTH_KEY = 'sive.conversation-width';
const PREVIEW_WIDTH_KEY = 'sive.preview-width';

type Options = {
  collapsed: boolean;
  onCollapsedChange: (collapsed: boolean) => void;
  onOpen: () => void;
};

export function useAnalysisPreview({ collapsed, onCollapsedChange, onOpen }: Options) {
  const [initialPreviewWidth] = useState(() => readWidth(PREVIEW_WIDTH_KEY, 0) || undefined);
  const [initialConversationWidth] = useState(() =>
    initialPreviewWidth ? undefined : readWidth(CONVERSATION_WIDTH_KEY, DEFAULT_CONVERSATION_WIDTH),
  );
  const preferredWidth = useRef(initialPreviewWidth);
  const workspace = useRef<HTMLDivElement>(null);
  const conversationPanel = usePanelRef();
  const previewPanel = usePanelRef();
  const rememberToggleFocus = usePanelToggleFocus(workspace, DATASET_PREVIEW_ID, collapsed);
  const collapsePreview = usePanelCollapsePreview(previewPanel, MIN_ANALYSIS_PANEL_WIDTH, () => {
    rememberToggleFocus();
    onCollapsedChange(true);
  });

  useLayoutEffect(() => {
    if (collapsed) return;

    const frame = requestAnimationFrame(() => {
      const panel = previewPanel.current;
      if (!panel) return;

      if (preferredWidth.current) panel.resize(preferredWidth.current);
      else preferredWidth.current = panel.getSize().inPixels;
    });
    return () => cancelAnimationFrame(frame);
  }, [collapsed, previewPanel]);

  const savePreviewWidth = () => {
    const width = previewPanel.current?.getSize().inPixels;
    if (!width) return;

    preferredWidth.current = width;
    saveWidth(PREVIEW_WIDTH_KEY, width);
  };

  const onLayoutChanged = (_: Layout, { isUserInteraction }: LayoutChangedMeta) => {
    if (isUserInteraction && !collapsed && !collapsePreview.shouldCollapse()) {
      requestAnimationFrame(savePreviewWidth);
    }
  };

  const resetWidth = () => {
    conversationPanel.current?.resize(DEFAULT_CONVERSATION_WIDTH);
    requestAnimationFrame(savePreviewWidth);
  };

  const toggle = () => {
    rememberToggleFocus();
    if (collapsed) onOpen();
    onCollapsedChange(!collapsed);
  };

  return {
    workspace,
    conversationPanel,
    previewPanel,
    collapsePreview,
    initialConversationWidth,
    initialPreviewWidth,
    onLayoutChanged,
    resetWidth,
    toggle,
  };
}
