import { taskStatus as status } from '../shared/conversation-markdown';
export { conversationMarkdown } from '../shared/conversation-markdown';
import type { Progress, Run, Task } from '../shared/contracts';
import { dataTable, escape, exportMarkdown, exportTableStyles } from './export-tables';
import styles from './conversation-export.css?raw';
import script from './conversation-export-runtime.js?raw';
import { defaultTheme, themeConfig, themePalette, type ThemeSettings } from '../shared/theme';
import { chartHTML, chartRuntime } from './render';

const pendingTask = (runs: Run[], task: Task | null) =>
  task && !runs.some((run) => run.id === task.runId) ? task : null;
function evidence(result: Run['result']) {
  return `<details class="evidence"><summary>SQL 与计算数据 · ${result.data.length} 行</summary><pre><code>${escape(result.sql || '')}</code></pre>${result.truncated ? '<p class="notice">结果已截断，以下为分析时保存的部分数据。</p>' : ''}${dataTable(result)}</details>`;
}
function eventsHTML(events: Progress[]) {
  return `<details class="events"><summary>执行过程 · ${events.length} 条记录</summary><ol>${events.map((event) => `<li><time>${escape(event.at)}</time><div><strong>${escape(event.label)}</strong>${event.durationMs == null ? '' : `<small> · ${(event.durationMs / 1000).toFixed(1)} 秒</small>`}${event.detail ? `<p>${escape(event.detail)}</p>` : ''}${event.recovery ? `<p class="muted">${escape(event.recovery)}</p>` : ''}${event.sql ? `<pre><code>${escape(event.sql)}</code></pre>` : ''}</div></li>`).join('')}</ol></details>`;
}
async function completedArticle(run: Run, index: number, settings: ThemeSettings) {
  let chart = '';
  if (run.chart) {
    // Store the 2 MiB runtime once; each chart remains in its own sandboxed frame.
    const document = await chartHTML(run.chart, settings, false);
    chart = `<figure><figcaption>分析图表</figcaption><iframe title="第 ${index + 1} 轮分析图表" sandbox="allow-scripts" data-chart-document="${escape(document)}"></iframe><p class="chart-status muted" role="status">正在绘制图表…</p></figure>`;
  }
  return `<article id="turn-${index + 1}"><header class="turn-header"><span>第 ${index + 1} 轮</span><time>${escape(run.createdAt)}</time></header><h2>${escape(run.question)}</h2><div class="metadata"><span>数据 · ${escape(run.sourceName)}</span><span>模型 · ${escape(run.modelName)}</span></div><section class="answer">${exportMarkdown(run.result.text || '没有文字总结，请查看计算数据。')}</section>${chart}${run.chartError ? `<p class="notice">${escape(run.chartError)}</p>` : ''}${run.semantic ? `<details><summary>业务口径</summary><p>${escape(run.semantic)}</p></details>` : ''}${evidence(run.result)}${eventsHTML(run.events)}</article>`;
}

function unfinishedArticle(pending: Task, turn: number) {
  return `<article class="unfinished" id="turn-${turn}"><header class="turn-header"><span>${escape(status[pending.status])}</span><time>${escape(pending.startedAt)}</time></header><h2>${escape(pending.question)}</h2><div class="metadata"><span>数据 · ${escape(pending.sourceName)}</span><span>模型 · ${escape(pending.modelName)}</span></div>${pending.error ? `<p class="notice">${escape(pending.error)}</p>` : ''}${pending.preview ? `<p class="notice">以下是导出时的中间结果，不代表已完成的分析。</p><section class="answer">${exportMarkdown(pending.preview.text || '')}</section>${evidence(pending.preview)}` : ''}${eventsHTML(pending.events)}</article>`;
}

export async function conversationHTML(
  runs: Run[],
  task: Task | null,
  settings: ThemeSettings = defaultTheme,
) {
  const p = themePalette(settings);
  const pending = pendingTask(runs, task);
  const articles = await Promise.all(runs.map((run, index) => completedArticle(run, index, settings)));
  if (pending) articles.push(unfinishedArticle(pending, runs.length + 1));
  const hasCharts = runs.some((run) => run.chart);
  // Escape script delimiters even inside JSON; no data is interpreted as executable HTML.
  const runtime = JSON.stringify(hasCharts ? chartRuntime() : '').replace(/</g, '\\u003c');
  return `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; frame-src about:; img-src data: blob:"><title>Sive · 分析会话</title><style>
  :root{color-scheme:${settings.mode === 'dark' ? 'dark' : 'light'};--surface:${p.surface};--background:${p.background};--text:${p.text};--muted:${p.muted};--border:${p.border};--accent:${themeConfig.accent};--article-radius:${themeConfig.radius + 4}px}
  ${styles}
  ${exportTableStyles}</style></head><body><main><header class="document-header"><div class="brand">SIVE / ANALYSIS</div><h1>分析会话</h1><p class="muted">${runs.length} 轮已完成分析${pending ? ' · 含未完成任务快照' : ''} · 文字、图表与计算依据均保存在本文件中</p></header>${articles.join('') || '<article>此会话暂无分析记录。</article>'}<noscript><p class="notice">图表需要启用 JavaScript。文字、SQL 与计算数据仍可查看。</p></noscript><footer>导出内容为分析时的快照，不会重新查询数据或调用模型。图表可离线查看；结论请结合计算依据核对。</footer></main><script>
  const runtime=${runtime};
  ${script}
  </script></body></html>`;
}
