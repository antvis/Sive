import type { Conversation, RunSummary, Task } from '@shared/contracts';

export function conversationView(runs: RunSummary[], tasks: Task[], conversationId: string) {
  type Entry = { kind: 'run'; run: RunSummary } | { kind: 'task'; task: Task };
  const entries = new Map<string, Entry>();
  for (const task of tasks) {
    if (task.conversationId === conversationId && task.status !== 'done')
      entries.set(task.id, { kind: 'task', task });
  }
  for (const run of runs) {
    if (run.conversationId === conversationId) entries.set(run.id, { kind: 'run', run });
  }

  const sequence = (entry: Entry) => (entry.kind === 'run' ? entry.run.sequence : (entry.task.sequence ?? 0));
  return [...entries.values()].sort((a, b) => sequence(a) - sequence(b));
}

export function conversationStatus(
  conversation: Conversation,
  runs: RunSummary[],
  tasks: Task[],
  readSequence = -1,
) {
  let sequence = -1;
  let status: Task['status'] | undefined;
  let unreadSequence: number | undefined;
  for (const task of tasks) {
    const taskSequence = task.sequence ?? -1;
    if (task.conversationId === conversation.id && taskSequence > sequence) {
      sequence = taskSequence;
      status = task.status;
    }
  }
  for (const run of runs) {
    if (run.conversationId !== conversation.id) continue;
    if (run.sequence > sequence) {
      sequence = run.sequence;
      status = 'done';
    }
    if (run.sequence > readSequence && run.sequence > (unreadSequence ?? -1)) unreadSequence = run.sequence;
  }
  return { status, unreadSequence };
}
