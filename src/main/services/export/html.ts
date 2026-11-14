import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';
import { randomUUID } from 'node:crypto';
import MarkdownIt from 'markdown-it';
import type { ResultDocument } from '@shared/results';
import { resultValue } from '@shared/results';

export const CHART_RENDER_TIMEOUT_MS = 10000;

const markdown = new MarkdownIt({ html: false, breaks: true, linkify: true });

const escape = (value: string) => markdown.utils.escapeHtml(value);
let runtime: Promise<string> | undefined;

function chartRuntime() {
  const require = createRequire(__filename);
  return (runtime ??= readFile(
    path.resolve(path.dirname(require.resolve('@antv/gpt-vis')), '../umd/index.min.js'),
    'utf8',
  ));
}

export async function resultHTML(document: ResultDocument): Promise<string> {
  const specs: unknown[] = [];
  const body = document.sections
    .map((section) => {
      if (section.type === 'markdown') return markdown.render(section.text);
      if (section.type === 'sql') return `<h2>SQL</h2><pre><code>${escape(section.text)}</code></pre>`;
      if (section.type === 'notice') return `<p class="notice">${escape(section.text)}</p>`;
      if (section.type === 'chart') {
        const index = specs.push(section.spec) - 1;
        const flow = typeof section.spec === 'string' || section.spec.type === 'table';
        return `<section class="chart${flow ? ' flow' : ''}" id="chart-${index}"></section>`;
      }
      return `<p>已保存结果：${section.rows.length} 行</p><table><thead><tr>${section.columns.map((column) => `<th>${escape(column)}</th>`).join('')}</tr></thead><tbody>${section.rows.map((row) => `<tr>${section.columns.map((column) => `<td>${escape(resultValue(row[column]))}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
    })
    .join('\n');
  const nonce = randomUUID();
  const scriptData = JSON.stringify(specs)
    .replace(/</g, '\\u003c')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
  const script = specs.length ? (await chartRuntime()).replace(/<\/script/gi, '<\\/script') : '';
  return `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'nonce-${nonce}'; style-src 'unsafe-inline'; img-src data: blob:; font-src data:; connect-src 'none'; base-uri 'none'; form-action 'none'">
<title>${escape(document.title)}</title><style>
*{box-sizing:border-box}body{margin:0;background:white;color:#243039;font:14px/1.7 -apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif}
main{max-width:1120px;margin:auto;padding:32px}h1{font-size:24px}h2{font-size:18px}small{color:#687682}
p,th,td,h1,h2{overflow-wrap:anywhere}pre{white-space:pre-wrap;overflow-wrap:anywhere;background:#f5f6f8;padding:12px;border-radius:8px}
table{width:100%;border-collapse:collapse;font-size:12px;table-layout:fixed;margin:16px 0}td,th{border:1px solid #dde3e8;padding:6px;text-align:left;white-space:pre-wrap}th{background:#f5f6f8}
.chart{margin:20px 0;overflow:hidden}.chart.flow,.chart.failed{overflow:visible}.chart.flow>*{height:auto!important;overflow:visible!important}
.chart.flow table{min-width:0!important;width:100%;table-layout:fixed}.chart.flow th,.chart.flow td{white-space:pre-wrap;overflow-wrap:anywhere}
.notice{color:#a23c30}img,svg{max-width:100%}.chart img{height:auto!important}
@media print{main{padding:0}body{font-size:11px}tr,.chart{break-inside:avoid}.chart.flow,.chart.failed{break-inside:auto}h1,h2{break-after:avoid}thead{display:table-header-group}}
</style><script nonce="${nonce}">${script}</script></head><body><main>
<small>Sive · ${escape(document.updatedAt)}</small><h1>${escape(document.title)}</h1>${body}
</main><script nonce="${nonce}">
window.siveExportReady = (async () => {
  await document.fonts.ready;
  const specs = ${scriptData};
  for (const [index, spec] of specs.entries()) {
    const container = document.getElementById('chart-' + index);
    let chart, failed = false;
    const fail = () => { failed = true; };
    addEventListener('unhandledrejection', fail);
    try {
      chart = new GPTVis.GPTVis({container, width:container.clientWidth, height:400});
      chart.render(spec);
      // GPTVis table and summary render synchronously; only graphical charts need polling.
      if (!container.classList.contains('flow')) {
        let previous = '', stable = 0, ready = false;
        for (let attempt = 0; attempt < ${CHART_RENDER_TIMEOUT_MS / 250}; attempt++) {
          await new Promise(resolve => setTimeout(resolve, 250));
          if (failed) throw new Error('图表渲染失败');
          const canvases = [...container.querySelectorAll('canvas')];
          const drawing = container.querySelector('svg') || canvases.length;
          const snapshot = container.innerHTML + canvases.map(canvas => canvas.toDataURL()).join('');
          stable = drawing && snapshot === previous ? stable + 1 : 0;
          previous = snapshot;
          if (stable >= 3) { ready = true; break; }
        }
        if (!ready) throw new Error('图表渲染超时');
      }
      for (const canvas of container.querySelectorAll('canvas')) {
        const image = new Image();
        image.src = canvas.toDataURL('image/png');
        image.style.cssText = canvas.style.cssText;
        image.width = canvas.clientWidth;
        image.height = canvas.clientHeight;
        await image.decode();
        canvas.replaceWith(image);
      }
    } catch {
      chart?.destroy();
      container.classList.add('failed');
      container.replaceChildren();
      const notice = document.createElement('p');
      notice.className = 'notice';
      notice.textContent = '图表无法渲染，以下保留原始图表配置。';
      const source = document.createElement('pre');
      source.textContent = typeof spec === 'string' ? spec : JSON.stringify(spec, null, 2);
      container.append(notice, source);
    } finally {
      removeEventListener('unhandledrejection', fail);
    }
  }
  await document.fonts.ready;
  await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  return true;
})();
</script></body></html>`;
}
