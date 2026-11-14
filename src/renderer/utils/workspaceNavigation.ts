import { z } from 'zod';
import type { WorkspaceState } from '../types';

export type AppPage = 'welcome' | 'datasets' | 'analysis' | 'snippets' | 'settings';

const navigationSchema = z.object({
  page: z.enum(['welcome', 'datasets', 'analysis', 'snippets', 'settings']),
  tabs: z.array(z.object({ datasetId: z.string(), conversationId: z.string().nullable() })),
  activeDatasetId: z.string().nullable(),
  drafts: z.record(z.string(), z.string()),
});

export type WorkspaceNavigation = z.infer<typeof navigationSchema>;

export const draftKey = (datasetId: string, conversationId: string | null) =>
  JSON.stringify([datasetId, conversationId]);

export function readNavigation(): WorkspaceNavigation {
  try {
    return navigationSchema.parse(JSON.parse(localStorage.getItem('sive.workspace') ?? 'null'));
  } catch {
    return { page: 'welcome', tabs: [], activeDatasetId: null, drafts: {} };
  }
}

export function saveNavigation(navigation: WorkspaceNavigation) {
  try {
    localStorage.setItem('sive.workspace', JSON.stringify(navigation));
  } catch {
    // Navigation remains available when local storage cannot be written.
  }
}

export function reconcileNavigation(
  current: WorkspaceNavigation,
  state: WorkspaceState,
): WorkspaceNavigation {
  const datasets = new Set(state.datasets.map((dataset) => dataset.id));
  const conversations = new Map(state.conversations.map((conversation) => [conversation.id, conversation]));
  const seen = new Set<string>();
  const tabs = current.tabs
    .filter(({ datasetId }) => {
      if (!datasets.has(datasetId) || seen.has(datasetId)) return false;
      seen.add(datasetId);
      return true;
    })
    .map((tab) => {
      if (tab.conversationId === null || conversations.get(tab.conversationId)?.datasetId === tab.datasetId)
        return tab;
      const latest = state.conversations
        .filter((conversation) => conversation.datasetId === tab.datasetId)
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0];
      return { ...tab, conversationId: latest?.id ?? null };
    });
  const activeDatasetId = tabs.some((tab) => tab.datasetId === current.activeDatasetId)
    ? current.activeDatasetId
    : (tabs.at(-1)?.datasetId ?? null);
  const validDrafts = new Set([
    ...state.datasets.map((dataset) => draftKey(dataset.id, null)),
    ...state.conversations
      .filter((conversation) => datasets.has(conversation.datasetId))
      .map((conversation) => draftKey(conversation.datasetId, conversation.id)),
  ]);
  return {
    ...current,
    tabs,
    activeDatasetId,
    page:
      current.page === 'analysis' && !activeDatasetId
        ? datasets.size
          ? 'datasets'
          : 'welcome'
        : current.page,
    drafts: Object.fromEntries(
      Object.entries(current.drafts).filter(([key, value]) => validDrafts.has(key) && value),
    ),
  };
}
