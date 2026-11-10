import type { UIMessage } from 'ai';
import type { State } from '@shared/contracts';
import { conversationView } from '../../utils/conversationView';

type AnalysisEntry = ReturnType<typeof conversationView>[number];

export type AnalysisMessage = UIMessage<
  { createdAt?: string; analysisId?: string },
  { analysis: AnalysisEntry }
>;

export function analysisEntry(state: State, id: string): AnalysisEntry | undefined {
  const run = state.runs.find((item) => item.id === id);
  const task = state.tasks.find((item) => item.id === id);
  return run ? { kind: 'run', run } : task ? { kind: 'task', task } : undefined;
}

export function analysisMessages(state: State | null | undefined, conversationId: string): AnalysisMessage[] {
  if (!state || !conversationId) return [];
  return conversationView(state.runs, state.tasks, conversationId).flatMap((entry): AnalysisMessage[] => {
    const value = entry.kind === 'run' ? entry.run : entry.task;
    const createdAt = entry.kind === 'run' ? entry.run.createdAt : entry.task.startedAt;
    return [
      {
        id: `${value.id}:user`,
        role: 'user',
        metadata: { createdAt, analysisId: value.id },
        parts: [{ type: 'text', text: value.question }],
      },
      {
        id: value.id,
        role: 'assistant',
        metadata: { createdAt },
        parts: [{ type: 'data-analysis', id: value.id, data: entry }],
      },
    ];
  });
}
