import type { State } from '@shared/contracts';
import type { WorkbenchServices } from './index';

// Read-only composition; persistence and transactions stay with their domain service.
export function buildWorkspaceState(services: WorkbenchServices): State {
  const models = services.models.profiles();
  const chats = services.conversations.list();
  const runs = services.records.listRuns();
  const tasks = services.records.listTasks();
  for (const task of services.analysis.tasks.values()) {
    const index = tasks.findIndex((entry) => entry.id === task.id);
    if (index >= 0) tasks[index] = task;
  }
  return {
    conversations: chats.filter((c) => !c.deletedAt),
    deletedConversations: chats.filter((c) => c.deletedAt),
    datasets: services.datasets.list(),
    runs,
    tasks,
    activeModelId: services.models.activeModelId,
    theme: services.settings.theme(),
    models: models.map(({ encryptedKey, ...model }) => ({ ...model, hasKey: !!encryptedKey })),
  };
}
