import type { Progress, Run, Task } from '@shared/contracts';

const taskStatus: Record<Task['status'], string> = {
  running: '分析中 · 尚未完成',
  cancelling: '正在停止',
  done: '已完成',
  error: '分析失败',
  cancelled: '已取消',
  interrupted: '已中断',
};

function fenced(text: string, language: string) {
  let length = 3;
  for (const match of text.matchAll(/`+/g)) length = Math.max(length, match[0].length + 1);
  const fence = '`'.repeat(length);
  return `${fence}${language}\n${text}\n${fence}`;
}
function eventsMarkdown(events: Progress[]) {
  return events
    .map(
      (event) =>
        `- ${event.at} ${event.label}${event.durationMs == null ? '' : ` · ${(event.durationMs / 1000).toFixed(1)} 秒`}${event.detail ? ` · ${event.detail}` : ''}${event.recovery ? `\n\n${event.recovery}` : ''}${event.sql ? '\n\n' + fenced(event.sql, 'sql') : ''}`,
    )
    .join('\n');
}
export function replyMarkdown(run: Run) {
  const sections = [
    `数据：${run.sourceName} · 模型：${run.modelName} · ${run.createdAt}`,
    run.result.text || '没有文字总结，请查看计算结果。',
  ];
  if (run.chart)
    sections.push(
      '### 图表配置',
      'Markdown 不包含交互式图表；以下配置与计算数据可用于重绘。',
      fenced(JSON.stringify(run.chart, null, 2), 'json'),
    );
  if (run.chartError) sections.push('图表状态：' + run.chartError);
  sections.push(
    '### 业务口径',
    run.semantic || '未提供',
    '### SQL',
    fenced(run.result.sql || '', 'sql'),
    `### 计算数据${run.result.truncated ? '（已截断）' : ''}`,
    fenced(JSON.stringify(run.result.data, null, 2), 'json'),
    '### 执行过程',
    eventsMarkdown(run.events) || '暂无执行记录',
  );
  return sections.join('\n\n');
}

export function taskReplyMarkdown(task: Task) {
  const sections = [taskStatus[task.status]];
  if (task.error) sections.push(task.error);
  if (task.persistenceError) sections.push(task.persistenceError);
  if (task.preview) {
    sections.push('### 中间结果（未完成）');
    if (task.preview.text) sections.push(task.preview.text);
    sections.push('### SQL', fenced(task.preview.sql || '', 'sql'));
    sections.push(
      `### 计算数据${task.preview.truncated ? '（已截断）' : ''}`,
      fenced(JSON.stringify(task.preview.data, null, 2), 'json'),
    );
  }
  sections.push('### 执行过程', eventsMarkdown(task.events) || '暂无执行记录');
  return sections.join('\n\n');
}
