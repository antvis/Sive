import type { State, Task } from '@shared/contracts';
import type { DataServices } from '@main/db';

// Read-only composition; persistence and transactions stay with their domain service.
export function buildWorkspaceState(data: DataServices, task: Task | null): State {
  const models = data.providers.models();
  const chats = data.conversations.listConversations();
  const runs = data.conversations.listRuns();
  const tasks = data.conversations.listTasks();
  const current =
    task && (runs.some((run) => run.id === task.id) || tasks.some((entry) => entry.id === task.id))
      ? task
      : null;
  if (current && current.status !== 'done') {
    const index = tasks.findIndex((entry) => entry.id === current.id);
    if (index >= 0) tasks[index] = current;
  }
  return {
    conversations: chats.filter((c) => !c.deletedAt),
    deletedConversations: chats.filter((c) => c.deletedAt),
    datasets: data.datasets.list(),
    runs,
    tasks,
    task: current,
    activeModelId: data.providers.activeModelId,
    theme: data.settings.theme(),
    models: models.map(({ encryptedKey, ...model }) => ({ ...model, hasKey: !!encryptedKey })),
  };
}
