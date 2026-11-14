import { useEffect, useRef, useState } from 'react';
import type { WorkspaceState } from '../types';
import { draftKey, readNavigation, reconcileNavigation, saveNavigation } from '../utils/workspaceNavigation';
import type { AppPage } from '../utils/workspaceNavigation';

export function useWorkspaceNavigation(state: WorkspaceState | null) {
  const [navigation, setNavigation] = useState(readNavigation);
  const previousDatasetCount = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (!state) return;
    const previous = previousDatasetCount.current;
    previousDatasetCount.current = state.datasets.length;
    setNavigation((current) => {
      const next = reconcileNavigation(current, state);
      if (
        state.datasets.length &&
        ((previous === undefined && next.page === 'welcome') ||
          (previous !== undefined && state.datasets.length > previous))
      )
        next.page = 'datasets';
      return next;
    });
  }, [state]);

  useEffect(() => {
    if (state) saveNavigation(navigation);
  }, [navigation, state]);

  const conversationsFor = (datasetId: string) =>
    (state?.conversations ?? [])
      .filter((conversation) => conversation.datasetId === datasetId)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

  const openDataset = (datasetId: string, conversationId?: string | null) => {
    if (!state?.datasets.some((dataset) => dataset.id === datasetId)) return;
    setNavigation((current) => {
      const existing = current.tabs.find((tab) => tab.datasetId === datasetId);
      const tab = {
        datasetId,
        conversationId:
          conversationId !== undefined
            ? conversationId
            : existing
              ? existing.conversationId
              : (conversationsFor(datasetId)[0]?.id ?? null),
      };
      return {
        ...current,
        page: 'analysis',
        activeDatasetId: datasetId,
        tabs: existing
          ? current.tabs.map((item) => (item.datasetId === datasetId ? tab : item))
          : [...current.tabs, tab],
      };
    });
  };

  const closeDataset = (id: string) =>
    setNavigation((current) => {
      const index = current.tabs.findIndex((tab) => tab.datasetId === id);
      const tabs = current.tabs.filter((tab) => tab.datasetId !== id);
      const activeDatasetId =
        current.activeDatasetId === id
          ? (tabs[Math.min(index, tabs.length - 1)]?.datasetId ?? null)
          : current.activeDatasetId;
      return {
        ...current,
        tabs,
        activeDatasetId,
        page: current.page === 'analysis' && !activeDatasetId ? 'datasets' : current.page,
      };
    });

  const setDraft = (datasetId: string, conversationId: string | null, question: string) =>
    setNavigation((current) => {
      const drafts = { ...current.drafts };
      const key = draftKey(datasetId, conversationId);
      if (question) drafts[key] = question;
      else delete drafts[key];
      return { ...current, drafts };
    });

  const completeStart = (datasetId: string, previousId: string | null, id: string, submitted: string) =>
    setNavigation((current) => {
      const drafts = { ...current.drafts };
      const key = draftKey(datasetId, previousId);
      if (drafts[key] === submitted) delete drafts[key];
      else if (
        previousId !== id &&
        drafts[key] &&
        current.tabs.some((tab) => tab.datasetId === datasetId && tab.conversationId === previousId)
      ) {
        drafts[draftKey(datasetId, id)] = drafts[key];
        delete drafts[key];
      }
      return {
        ...current,
        drafts,
        tabs: current.tabs.map((tab) =>
          tab.datasetId === datasetId && tab.conversationId === previousId
            ? { ...tab, conversationId: id }
            : tab,
        ),
      };
    });

  const activeConversationId =
    navigation.tabs.find((tab) => tab.datasetId === navigation.activeDatasetId)?.conversationId ?? null;
  return {
    ...navigation,
    activeConversationId,
    datasetTabs: navigation.tabs.flatMap((tab) => {
      const dataset = state?.datasets.find((item) => item.id === tab.datasetId);
      return dataset ? [dataset] : [];
    }),
    conversationsFor,
    openDataset,
    closeDataset,
    setDraft,
    completeStart,
    navigate: (page: AppPage) => setNavigation((current) => ({ ...current, page })),
    selectConversation: (id: string) => {
      const conversation = state?.conversations.find((item) => item.id === id);
      if (conversation) openDataset(conversation.datasetId, id);
    },
  };
}
