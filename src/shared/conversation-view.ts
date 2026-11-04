import type { RunSummary, Task } from '../../shared/contracts';

export function conversationView<R extends RunSummary>(
  runs: R[],
  tasks: Task[],
  activeTask: Task | null,
  conversationId: string,
  selectedRunId = '',
) {
  const latestTask = tasks.find((task) => task.conversationId === conversationId);
  const latestRun = runs.find((run) => run.conversationId === conversationId);
  const currentTask = selectedRunId
    ? tasks.find((task) => task.conversationId === conversationId && task.runId === selectedRunId) || null
    : conversationId
      ? (activeTask?.conversationId === conversationId ? activeTask : latestTask) || null
      : null;
  const activeRunId =
    selectedRunId || (currentTask ? currentTask.runId || currentTask.parentId || '' : latestRun?.id || '');
  const byId = new Map(runs.map((run) => [run.id, run]));
  const session: R[] = [];
  const seen = new Set<string>();
  let run = byId.get(activeRunId);
  while (run && run.conversationId === conversationId && !seen.has(run.id)) {
    session.push(run);
    seen.add(run.id);
    run = run.parentId ? byId.get(run.parentId) : undefined;
  }
  session.reverse();
  return { activeRunId, currentTask, session };
}
