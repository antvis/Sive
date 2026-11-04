import { taskStatus as status } from '../shared/conversation-markdown';
export { conversationMarkdown } from '../shared/conversation-markdown';
import type { Progress, Run, Task } from '../shared/contracts';
import { exportMarkdown, exportTableStyles } from './export-tables';
import { isNumericColumn } from '../shared/table-values';
import { defaultTheme, themeConfig, themePalette, type ThemeSettings } from '../shared/theme';
import { chartHTML, chartRuntime, escape } from './render';

const pendingTask = (runs: Run[], task: Task | null) =>
  task && !runs.some((run) => run.id === task.runId) ? task : null;
const valueText = (value: unknown) =>
  value == null ? '—' : typeof value === 'object' ? JSON.stringify(value) : String(value);
function dataTable(result: Run['result']) {
  const fields = [
    ...new Set([
      ...(result.schema || []).map((field) => field.name),
      ...result.data.flatMap((row) => Object.keys(row)),
    ]),
  ];
  const attributes = (name: string) =>
    isNumericColumn(result.schema?.find((field) => field.name === name) || { name }, result.data)
      ? ' class="numeric"'
      : '';
  return `<div class="table-scroll"><table><thead><tr>${fields.map((name) => `<th${attributes(name)}>${escape(name)}</th>`).join('')}</tr></thead><tbody>${result.data.map((row) => `<tr>${fields.map((name) => `<td${attributes(name)}>${escape(valueText(row[name]))}</td>`).join('')}</tr>`).join('')}</tbody></table></div>${!result.data.length ? '<p class="muted">没有返回数据行。</p>' : ''}`;
}
function evidence(result: Run['result']) {
  return `<details class="evidence"><summary>SQL 与计算数据 · ${result.data.length} 行</summary><pre><code>${escape(result.sql || '')}</code></pre>${result.truncated ? '<p class="notice">结果已截断，以下为分析时保存的部分数据。</p>' : ''}${dataTable(result)}</details>`;
}
function eventsHTML(events: Progress[]) {
  return `<details class="events"><summary>执行过程 · ${events.length} 条记录</summary><ol>${events.map((event) => `<li><time>${escape(event.at)}</time><div><strong>${escape(event.label)}</strong>${event.durationMs == null ? '' : `<small> · ${(event.durationMs / 1000).toFixed(1)} 秒</small>`}${event.detail ? `<p>${escape(event.detail)}</p>` : ''}${event.recovery ? `<p class="muted">${escape(event.recovery)}</p>` : ''}${event.sql ? `<pre><code>${escape(event.sql)}</code></pre>` : ''}</div></li>`).join('')}</ol></details>`;
}
export async function conversationHTML(
  runs: Run[],
  task: Task | null,
  settings: ThemeSettings = defaultTheme,
) {
  const p = themePalette(settings);
  const pending = pendingTask(runs, task);
  const articles: string[] = [];
  let hasCharts = false;
  for (const [index, run] of runs.entries()) {
    let chart = '';
    if (run.chart) {
      // Store the 2 MiB runtime once; each chart remains in its own sandboxed frame.
      const document = await chartHTML(run.chart, settings, false);
      chart = `<figure><figcaption>分析图表</figcaption><iframe title="第 ${index + 1} 轮分析图表" sandbox="allow-scripts" data-chart-document="${escape(document)}"></iframe><p class="chart-status muted" role="status">正在绘制图表…</p></figure>`;
      hasCharts = true;
    }
    articles.push(
      `<article id="turn-${index + 1}"><header class="turn-header"><span>第 ${index + 1} 轮</span><time>${escape(run.createdAt)}</time></header><h2>${escape(run.question)}</h2><div class="metadata"><span>数据 · ${escape(run.sourceName)}</span><span>模型 · ${escape(run.modelName)}</span></div><section class="answer">${exportMarkdown(run.result.text || '没有文字总结，请查看计算数据。')}</section>${chart}${run.chartError ? `<p class="notice">${escape(run.chartError)}</p>` : ''}${run.semantic ? `<details><summary>业务口径</summary><p>${escape(run.semantic)}</p></details>` : ''}${evidence(run.result)}${eventsHTML(run.events)}</article>`,
    );
  }
  if (pending)
    articles.push(
      `<article class="unfinished" id="turn-${runs.length + 1}"><header class="turn-header"><span>${escape(status[pending.status])}</span><time>${escape(pending.startedAt)}</time></header><h2>${escape(pending.question)}</h2><div class="metadata"><span>数据 · ${escape(pending.sourceName)}</span><span>模型 · ${escape(pending.modelName)}</span></div>${pending.error ? `<p class="notice">${escape(pending.error)}</p>` : ''}${pending.preview ? `<p class="notice">以下是导出时的中间结果，不代表已完成的分析。</p><section class="answer">${exportMarkdown(pending.preview.text || '')}</section>${evidence(pending.preview)}` : ''}${eventsHTML(pending.events)}</article>`,
    );
  // Escape script delimiters even inside JSON; no data is interpreted as executable HTML.
  const runtime = JSON.stringify(hasCharts ? chartRuntime() : '').replace(/</g, '\\u003c');
  return `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; frame-src about:; img-src data: blob:"><title>Sive · 分析会话</title><style>
  :root{color-scheme:${settings.mode === 'dark' ? 'dark' : 'light'};--surface:${p.surface};--background:${p.background};--text:${p.text};--muted:${p.muted};--border:${p.border};--accent:${themeConfig.accent}}
  *{box-sizing:border-box}body{margin:0;background:var(--background);color:var(--text);font:14px/1.75 -apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif}main{max-width:1080px;padding:40px 24px;margin:auto}.document-header{margin-bottom:28px}.brand{font-size:13px;color:var(--accent);font-weight:650;letter-spacing:.08em}h1{font-size:28px;margin:8px 0}h2{font-size:19px;line-height:1.55;margin:12px 0;overflow-wrap:anywhere}h3{font-size:16px}.muted,small,time{color:var(--muted)}article{background:var(--surface);border:1px solid var(--border);border-radius:${themeConfig.radius + 4}px;padding:26px;margin-bottom:24px;min-width:0}.turn-header,.metadata{display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap;font-size:12px;color:var(--muted)}.turn-header>span{color:var(--accent);font-weight:600}.metadata{justify-content:flex-start;gap:8px 24px;border-bottom:1px solid var(--border);padding-bottom:16px;margin-bottom:20px}.answer{overflow-wrap:anywhere}.answer h1{font-size:21px}.answer p{margin:10px 0}.answer blockquote{margin:16px 0;padding:4px 16px;border-left:3px solid var(--accent);background:var(--background)}.answer ul,.answer ol{padding-left:24px}pre{overflow:auto;white-space:pre-wrap;overflow-wrap:anywhere;background:var(--background);padding:14px;border-radius:6px;font:12px/1.7 ui-monospace,SFMono-Regular,monospace}code{font-family:ui-monospace,SFMono-Regular,monospace}p code,li code{background:var(--background);padding:2px 4px;border-radius:3px}.table-scroll{overflow:auto}table{border-collapse:collapse;max-width:100%;font-size:13px;margin:12px 0}th,td{border-bottom:1px solid var(--border);padding:9px 14px;text-align:left;overflow-wrap:anywhere}th{background:var(--background);font-weight:600}figure{margin:24px 0;border:1px solid var(--border);border-radius:8px;overflow:hidden}figcaption{padding:12px 16px;border-bottom:1px solid var(--border);font-weight:600}iframe{display:block;width:100%;height:440px;border:0;background:var(--surface)}.chart-status{margin:0;padding:8px 16px;font-size:12px}.chart-status:empty{display:none}details{margin-top:14px;border-top:1px solid var(--border);padding-top:10px}summary{cursor:pointer;color:var(--muted);font-weight:500}.notice{padding:10px 14px;background:var(--background);border-left:3px solid var(--accent);overflow-wrap:anywhere}.events ol{list-style:none;padding:0}.events li{display:grid;grid-template-columns:175px minmax(0,1fr);gap:14px;border-bottom:1px solid var(--border);padding:10px 0}.events time{font-size:11px}.events p{margin:4px 0}footer{font-size:12px;color:var(--muted)}@media(max-width:600px){main{padding:20px 12px}article{padding:16px}h1{font-size:24px}h2{font-size:17px}iframe{height:360px}.events li{grid-template-columns:1fr;gap:2px}}@media print{body{background:white}main{padding:0}article{break-before:auto;border:0;padding:16px 0}h2,figcaption{break-after:avoid}figure,tr{break-inside:avoid}summary{display:none}}
  ${exportTableStyles}</style></head><body><main><header class="document-header"><div class="brand">SIVE / ANALYSIS</div><h1>分析会话</h1><p class="muted">${runs.length} 轮已完成分析${pending ? ' · 含未完成任务快照' : ''} · 文字、图表与计算依据均保存在本文件中</p></header>${articles.join('') || '<article>此会话暂无分析记录。</article>'}<noscript><p class="notice">图表需要启用 JavaScript。文字、SQL 与计算数据仍可查看。</p></noscript><footer>导出内容为分析时的快照，不会重新查询数据或调用模型。图表可离线查看；结论请结合计算依据核对。</footer></main><script>
  const runtime=${runtime};const states=new Map();
  addEventListener('message',event=>{if(event.data?.type!=='ava-chart')return;const frame=Array.from(document.querySelectorAll('iframe')).find(f=>f.contentWindow===event.source);if(!frame)return;states.set(frame,event.data.status);frame.nextElementSibling.textContent=event.data.status==='ready'?'':event.data.status==='error'?'图表未能渲染，请展开下方 SQL 与计算数据核对。':'正在绘制图表…';});
  window.analysisReady=()=>{const frames=Array.from(document.querySelectorAll('iframe'));return frames.some(f=>states.get(f)==='error')?'error':frames.every(f=>states.get(f)==='ready')?'ready':'waiting';};
  for(const frame of document.querySelectorAll('iframe[data-chart-document]')){frame.srcdoc=frame.dataset.chartDocument.replace('<script data-sive-runtime><'+'/script>',()=>'<script>'+runtime+'<'+'/script>');delete frame.dataset.chartDocument;}
  addEventListener('beforeprint',()=>{for(const d of document.querySelectorAll('details')){d.dataset.wasOpen=String(d.open);d.open=true;}});addEventListener('afterprint',()=>{for(const d of document.querySelectorAll('details'))d.open=d.dataset.wasOpen==='true';});
  </script></body></html>`;
}
