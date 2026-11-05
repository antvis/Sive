import type { Progress, Task } from '../../shared/contracts';

export type ProgressStep = Progress & {
  startedAt: string;
  status: 'running' | 'done' | 'error' | 'stopped' | 'skipped';
  calls: Progress[];
};
export const preparationStages = new Set(['source', 'schema', 'profile', 'semantic']);

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
    if (event.stage === 'modelstart' || event.stage === 'modelend') {
      const parent = [...active.values()].at(-1);
      if (parent) parent.calls.push(event);
      continue;
    }
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
      calls: [],
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

export function stageDescription(stage: string) {
  return (
    {
      source: '正在连接数据源并准备查询环境。',
      schema: '正在读取实际表结构和字段。',
      profile: '正在准备数据统计上下文。',
      semantic: '正在加载已配置的业务口径。',
      translate: '正在根据问题、表结构和业务口径生成查询；返回后才会执行。',
      query: '正在执行下方只读查询，返回后展示实际结果行数。',
      reason: '正在决定下一步操作；探索、调整或验证会随实际返回结果展示。',
      summarize: '正在根据已执行查询的结果整理结论。',
      visualize: '正在根据分析问题和计算结果选择图表、生成配置。',
    }[stage] || '正在执行当前操作。'
  );
}
