import type { State } from '@shared/contracts';
import { initialConversationState, type ConversationState } from '@renderer/utils/conversationState';

export const workspaceTabsStorageKey = 'sive.dataset-workspace';
export type WorkspaceTab = ConversationState & { id: string; open: boolean; dataOpen: boolean };
export function dataTab(datasetId: string): WorkspaceTab {
  return { ...initialConversationState, id: datasetId, datasetId, open: true, dataOpen: true };
}
export function conversationIdsWithContent(state: Pick<State, 'runs' | 'tasks'>) {
  return new Set([...state.runs, ...state.tasks].map((item) => item.conversationId));
}
// Persist drafts and navigation only; task snapshots and query data remain in the workspace.
export function serializeWorkspaceTabs(tabs: WorkspaceTab[]) {
  return JSON.stringify(tabs.map(({ dataOpen, ...tab }) => tab));
}
export function restoreWorkspaceTabs(serialized: string | null, state: State): WorkspaceTab[] {
  let entries: unknown;
  try {
    entries = JSON.parse(serialized || '[]');
  } catch {
    return [];
  }
  if (!Array.isArray(entries)) return [];
  const tabs = new Map<string, WorkspaceTab>();
  for (const entry of entries) {
    if (!entry || !state.datasets.some((d) => d.id === entry.datasetId)) continue;
    const base = dataTab(entry.datasetId);
    const conversationId =
      state.conversations.find((c) => c.id === entry.conversationId && c.datasetId === entry.datasetId)?.id ||
      '';
    const drafts: Record<string, string> = {};
    for (const [key, value] of Object.entries(entry.drafts || {}))
      if (
        typeof value === 'string' &&
        (key === `new:${entry.datasetId}` ||
          state.conversations.some((c) => c.id === key && c.datasetId === entry.datasetId))
      )
        drafts[key] = value;
    tabs.set(base.id, {
      ...base,
      conversationId,
      drafts,
      question:
        typeof entry.question === 'string' && conversationId === entry.conversationId ? entry.question : '',
      runId:
        state.runs.find(
          (r) => r.id === entry.runId && r.conversationId === conversationId && r.datasetId === base.id,
        )?.id || '',
      open: entry.open === true,
    });
  }
  return [...tabs.values()];
}
