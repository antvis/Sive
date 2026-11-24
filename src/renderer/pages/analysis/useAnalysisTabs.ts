import { useState } from 'react';
import type { ToolPreviewTab } from '../../components/chat/tool-preview';

export const DATASET_PREVIEW_TAB = 'dataset-preview';

type TabSelection = {
  chatId: string;
  activeTabId: string;
  tabs: ToolPreviewTab[];
};

export function useAnalysisTabs(chatId: string) {
  const [selection, setSelection] = useState<TabSelection>({ chatId, activeTabId: DATASET_PREVIEW_TAB, tabs: [] });

  if (selection.chatId !== chatId) {
    setSelection({ chatId, activeTabId: DATASET_PREVIEW_TAB, tabs: [] });
  }

  const selectTab = (id: string) => setSelection((current) => ({ ...current, activeTabId: id }));

  const openTab = (tab: ToolPreviewTab) => {
    setSelection((current) => {
      const index = current.tabs.findIndex(({ id }) => id === tab.id);
      return {
        ...current,
        activeTabId: tab.id,
        tabs: index < 0 ? [...current.tabs, tab] : current.tabs.with(index, tab),
      };
    });
  };

  const closeTab = (id: string) => {
    setSelection((current) => {
      const index = current.tabs.findIndex((tab) => tab.id === id);
      if (index < 0) return current;
      const tabs = current.tabs.toSpliced(index, 1);
      return {
        ...current,
        activeTabId:
          current.activeTabId === id
            ? (tabs[index] ?? tabs[index - 1])?.id ?? DATASET_PREVIEW_TAB
            : current.activeTabId,
        tabs,
      };
    });
  };

  return { activeTabId: selection.activeTabId, tabs: selection.tabs, selectTab, openTab, closeTab };
}
