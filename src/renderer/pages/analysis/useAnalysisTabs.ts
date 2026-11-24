import { useState } from 'react';
import type { ToolPreviewTab } from '../../components/chat/tool-preview';

const datasetTab = { id: 'dataset-preview', kind: 'dataset' } as const;

export type AnalysisTab = typeof datasetTab | (ToolPreviewTab & { kind: 'result' });

type TabSelection = {
  chatId: string;
  activeTabId: string;
  tabs: AnalysisTab[];
};

const initialTabs = { activeTabId: datasetTab.id, tabs: [datasetTab] };

export function useAnalysisTabs(chatId: string) {
  const [selection, setSelection] = useState<TabSelection>({ chatId, ...initialTabs });

  if (selection.chatId !== chatId) {
    setSelection({ chatId, ...initialTabs });
  }

  const selectTab = (id: string) => setSelection((current) => ({ ...current, activeTabId: id }));

  const openTab = (tab: AnalysisTab) => {
    setSelection((current) => {
      const index = current.tabs.findIndex(({ id }) => id === tab.id);
      const tabs =
        index >= 0
          ? current.tabs.with(index, tab)
          : tab.kind === 'dataset'
            ? [tab, ...current.tabs]
            : [...current.tabs, tab];
      return {
        ...current,
        activeTabId: tab.id,
        tabs,
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
          current.activeTabId === id ? ((tabs[index] ?? tabs[index - 1])?.id ?? '') : current.activeTabId,
        tabs,
      };
    });
  };

  return {
    activeTabId: selection.activeTabId,
    tabs: selection.tabs,
    selectTab,
    openDataset: () => openTab(datasetTab),
    openResult: (tab: ToolPreviewTab) => openTab({ ...tab, kind: 'result' }),
    closeTab,
  };
}
