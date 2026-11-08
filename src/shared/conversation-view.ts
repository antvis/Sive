import type { RunSummary, Task } from '../../shared/contracts';

export function conversationView(
  runs: RunSummary[],
  tasks: Task[],
  activeTask: Task | null,
  conversationId: string,
) {
  type Entry = { kind: 'run'; run: RunSummary } | { kind: 'task'; task: Task };
  const entries = new Map<string, Entry>();
  for (const task of tasks) {
    if (task.conversationId === conversationId && task.status !== 'done')
      entries.set(task.id, { kind: 'task', task });
  }
  if (activeTask?.conversationId === conversationId && activeTask.status !== 'done')
    entries.set(activeTask.id, { kind: 'task', task: activeTask });
  for (const run of runs) {
    if (run.conversationId === conversationId) entries.set(run.id, { kind: 'run', run });
  }
  const sequence = (entry: Entry) => (entry.kind === 'run' ? entry.run.sequence : (entry.task.sequence ?? 0));
  return [...entries.values()].sort((a, b) => sequence(a) - sequence(b));
}
