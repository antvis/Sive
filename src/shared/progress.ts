import type { Progress, Task } from './contracts';

// Diagnostics remain stored, but are not part of the user-facing analysis timeline.
export const isAnalysisEvent = (event: Progress) =>
  !['modelstart', 'modelend', 'capabilitystart', 'capabilityend'].includes(event.stage);

export type ProgressStep = Progress & {
  startedAt: string;
  status: 'running' | 'done' | 'error' | 'stopped' | 'skipped';
};

// Pair actual start/end events; repeated queries and retries remain separate steps.
export function progressSteps(
  events: Progress[],
  status: Task['status'],
  finishedAt?: string,
): ProgressStep[] {
  const steps: ProgressStep[] = [];
  const active = new Map<string, ProgressStep>();
  for (const event of events) {
    const skipped = event.chartOutcome === 'not-needed' || event.chartOutcome === 'empty-data';
    if (!isAnalysisEvent(event)) continue;
    const stage = event.stage.replace(/(start|end)$/, '');
    if (event.stage.endsWith('end')) {
      const step = active.get(stage);
      if (step) {
        const prefix = step.label.match(/^(第 \d+ (?:轮|次纠错) · )/)?.[0] || '';
        Object.assign(step, event, {
          stage,
          label: event.label.startsWith(prefix) ? event.label : prefix + event.label,
          sql: event.sql || step.sql,
          durationMs: event.durationMs ?? Math.max(0, Date.parse(event.at) - Date.parse(step.startedAt)),
          status: event.error ? 'error' : skipped ? 'skipped' : 'done',
        });
        active.delete(stage);
        continue;
      }
    }
    const step: ProgressStep = {
      ...event,
      stage,
      startedAt: event.at,
      status: event.error
        ? 'error'
        : skipped
          ? 'skipped'
          : event.stage.endsWith('start')
            ? 'running'
            : 'done',
    };
    steps.push(step);
    if (step.status === 'running') active.set(stage, step);
  }
  if (status !== 'running' && status !== 'cancelling') {
    for (const step of active.values()) {
      step.status = status === 'error' ? 'error' : 'stopped';
      step.durationMs = Math.max(0, Date.parse(finishedAt || events.at(-1)!.at) - Date.parse(step.startedAt));
    }
  }
  return steps;
}

export function progressDuration(ms: number) {
  if (!Number.isFinite(ms)) return '—';
  if (ms < 1000) return '< 1 秒';
  const seconds = Math.floor(ms / 1000);
  return seconds < 60 ? `${seconds} 秒` : `${Math.floor(seconds / 60)} 分 ${seconds % 60} 秒`;
}
