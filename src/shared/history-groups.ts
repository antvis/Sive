import type { Task } from '../../shared/contracts';

export function historyTime(task: Task): number | undefined {
  for (const value of [task.startedAt, task.events[0]?.at, task.finishedAt]) {
    const time = value ? Date.parse(value) : NaN;
    if (Number.isFinite(time)) return time;
  }
}

function historyGroup(time: number | undefined, now: Date): string {
  if (time === undefined) return '未记录时间';
  const day = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrow = new Date(day);
  tomorrow.setDate(day.getDate() + 1);
  const yesterday = new Date(day);
  yesterday.setDate(day.getDate() - 1);
  const week = new Date(day);
  week.setDate(day.getDate() - ((day.getDay() + 6) % 7));
  const lastWeek = new Date(week);
  lastWeek.setDate(week.getDate() - 7);
  if (time >= tomorrow.getTime()) return '其他时间';
  if (time >= day.getTime()) return '今天';
  if (time >= yesterday.getTime()) return '昨天';
  if (time >= week.getTime()) return '本周';
  if (time >= lastWeek.getTime()) return '上周';
  return '更早';
}

export function groupHistory(tasks: Task[], now: Date) {
  const groups = new Map<string, Task[]>();
  for (const task of tasks) {
    const label = historyGroup(historyTime(task), now);
    const group = groups.get(label) || [];
    group.push(task);
    groups.set(label, group);
  }
  return [...groups].map(([label, tasks]) => ({ label, tasks }));
}
