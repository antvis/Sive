import type { State, Task } from '../../shared/contracts';

export const workspaceTabsStorageKey = 'sive.workspace-tabs.v1';

export type WorkspaceTab = {
  id: string;
  datasetId: string;
  conversationId: string;
  runId: string;
  historyTask: Task | null;
  chat: boolean;
  full: boolean;
};

export function dataTab(datasetId: string): WorkspaceTab {
  return {
    id: crypto.randomUUID(),
    datasetId,
    conversationId: '',
    runId: '',
    historyTask: null,
    chat: false,
    full: false,
  };
}

export function hasConversationContent(
  state: Pick<State, 'runs' | 'tasks' | 'task'>,
  conversationId: string,
  question: string,
  historyTask: Task | null,
): boolean {
  return (
    !!question.trim() ||
    !!historyTask ||
    (!!conversationId &&
      (state.runs.some((run) => run.conversationId === conversationId) ||
        state.tasks.some((task) => task.conversationId === conversationId) ||
        state.task?.conversationId === conversationId))
  );
}

export function conversationIdsWithContent(state: Pick<State, 'runs' | 'tasks' | 'task'>) {
  return new Set(
    [
      ...state.runs.map((run) => run.conversationId),
      ...state.tasks.map((task) => task.conversationId),
      state.task?.conversationId,
    ].filter(Boolean),
  );
}

// Persist navigation references only, not query results or task snapshots.
export function serializeWorkspaceTabs(tabs: WorkspaceTab[]): string {
  return JSON.stringify(
    tabs.map(({ id, datasetId, conversationId, runId, chat, full, historyTask }) => ({
      id,
      datasetId,
      conversationId,
      runId,
      chat,
      full,
      historyTaskId: historyTask?.id,
    })),
  );
}

export function restoreWorkspaceTabs(
  serialized: string | null,
  state: Pick<State, 'datasets' | 'conversations' | 'runs' | 'tasks' | 'task'>,
): WorkspaceTab[] {
  let entries: unknown;
  try {
    entries = JSON.parse(serialized || '[]');
  } catch {
    return [];
  }
  if (!Array.isArray(entries)) return [];
  const tabs: WorkspaceTab[] = [];
  const seen = new Set<string>();
  const contentIds = conversationIdsWithContent(state);
  let restoredEmptyChat = false;
  for (const entry of entries) {
    if (
      !entry ||
      typeof entry !== 'object' ||
      typeof entry.id !== 'string' ||
      !entry.id ||
      seen.has(entry.id)
    )
      continue;
    if (!state.datasets.some((dataset) => dataset.id === entry.datasetId)) continue;
    seen.add(entry.id);
    const conversationId =
      state.conversations.find(
        (conversation) =>
          conversation.id === entry.conversationId && conversation.datasetId === entry.datasetId,
      )?.id || '';
    const runId =
      state.runs.find(
        (run) =>
          run.id === entry.runId &&
          run.datasetId === entry.datasetId &&
          (!conversationId || run.conversationId === conversationId),
      )?.id || '';
    const historyTask =
      [state.task, ...state.tasks].find(
        (task) => task?.id === entry.historyTaskId && task?.datasetId === entry.datasetId,
      ) || null;
    const chat = entry.chat === true;
    const hasContent = (!!conversationId && contentIds.has(conversationId)) || !!runId || !!historyTask;
    if (chat && !hasContent) {
      if (restoredEmptyChat) continue;
      restoredEmptyChat = true;
    }
    tabs.push({
      id: entry.id,
      datasetId: entry.datasetId,
      conversationId: hasContent ? conversationId : '',
      runId,
      historyTask,
      chat,
      full: chat && entry.full === true,
    });
  }
  return tabs;
}
