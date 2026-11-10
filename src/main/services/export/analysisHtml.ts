import { dataTable, escape, exportTableStyles } from './exportTables';
import { renderMarkdown } from '@shared/markdown';
import type { ChartSpec, Run } from '@shared/contracts';
import { defaultTheme, themeConfig, themePalette, type ThemeSettings } from '@shared/theme';
import { chartRuntime } from '../../utils/gptVis';
import { analysisTools, isAnalysisEvent } from '@shared/analysis';
export async function chartHTML(
  spec: ChartSpec,
  settings: ThemeSettings = defaultTheme,
  embedRuntime = true,
) {
  const palette = themePalette(settings);
  const themed =
    typeof spec.config === 'string'
      ? spec.config
      : {
          theme: settings.mode === 'dark' ? 'dark' : 'light',
          ...spec.config,
          style: {
            backgroundColor: palette.surface,
            palette: themeConfig.chartPalette,
            ...(typeof spec.config.style === 'object' && spec.config.style ? spec.config.style : {}),
          },
        };
  const config = JSON.stringify(themed)
    .replace(/</g, '\\u003c')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
  return `<!doctype html><html><head><meta charset="utf-8">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data: blob:; font-src data:; connect-src 'none'">
    <style>html,body,#container{margin:0;padding:0;width:100%;height:100%;font-family:Arial,sans-serif;background:${palette.surface};color:${palette.text}}html,body{overflow:hidden}#container{position:relative;min-width:0;min-height:0;overflow:hidden}</style>
    ${embedRuntime ? `<script>${chartRuntime()}</script>` : '<script data-sive-runtime></script>'}
    </head><body><div id="container"></div><script>
      const visConfig = ${config};
      let gptVis, failed = false, timer, retry = false;
      function fail() {
        failed = true;
        document.getElementById('container').textContent = '图表无法渲染，请查看计算数据或重新分析。';
        parent.postMessage({type:'ava-chart',status:'error'}, '*');
      }
      addEventListener('error', fail);
      addEventListener('unhandledrejection', fail);
      function draw() {
        if (failed) return;
        clearTimeout(timer);
        const rect = document.getElementById('container').getBoundingClientRect();
        if (rect.width < 10 || rect.height < 10) { timer = setTimeout(draw, 200); return; }
        try {
          gptVis ||= new GPTVis.GPTVis({ container: '#container', theme: '${settings.mode === 'dark' ? 'dark' : 'light'}' });
          gptVis.render(visConfig);
          timer = setTimeout(() => {
            try {
              const ready = document.querySelector('canvas,svg,table') || document.getElementById('container').textContent.trim();
              if (ready && !failed) parent.postMessage({type:'ava-chart',status:'ready'}, '*');
              else if (!retry && !failed) { retry = true; draw(); }
              else fail();
            } catch { fail(); }
          }, 1500);
        } catch { fail(); }
      }
      let resizeTimer;
      addEventListener('resize', () => { clearTimeout(resizeTimer); resizeTimer = setTimeout(draw, 180); });
      document.fonts.ready.then(draw).catch(fail);
    </script></body></html>`;
}
export async function analysisHTML(run: Run, settings: ThemeSettings = defaultTheme, saved = false) {
  const p = themePalette(settings);
  const savedOutput = saved ? run.snippet?.output : undefined;
  const output = savedOutput || run.output;
  const tools = analysisTools(output);
  const title = (saved && run.snippet?.title) || run.question;
  const updatedAt = (saved && run.snippet?.updatedAt) || run.createdAt;
  const charts = await Promise.all(
    output.charts.map(
      async ({ spec, resultId }) =>
        `<p>图表依据：${escape(resultId)}</p><iframe sandbox="allow-scripts" title="分析图表" srcdoc="${escape(await chartHTML(spec, settings))}"></iframe>`,
    ),
  );
  return `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; frame-src about:; img-src data: blob:">
  <title>${escape(title)}</title><style>
  *{box-sizing:border-box}body{margin:0;color:${p.text};background:${p.surface};font:14px/1.7 -apple-system,BlinkMacSystemFont,sans-serif}
  main{max-width:1080px;margin:auto;padding:32px}h1{font-size:24px}p,td,th,h1{overflow-wrap:anywhere}small{color:${p.muted}}
  iframe{width:100%;height:420px;border:0}pre{white-space:pre-wrap;overflow-wrap:anywhere;background:${p.background};padding:12px}
  table{border-collapse:collapse;width:100%;table-layout:auto;font-size:12px}td,th{padding:6px;border:1px solid ${p.border};text-align:left}
  @media print{body{font-size:11px}main{padding:0}iframe,tr{break-inside:avoid}h1,h2{break-after:avoid}}
  ${exportTableStyles}</style><script>window.chartStates=new Map();addEventListener('message',e=>{if(e.data?.type==='ava-chart'&&Array.from(document.querySelectorAll('iframe')).some(f=>f.contentWindow===e.source))window.chartStates.set(e.source,e.data.status)});window.analysisReady=()=>{const f=Array.from(document.querySelectorAll('iframe'));return f.some(x=>window.chartStates.get(x.contentWindow)==='error')?'error':f.every(x=>window.chartStates.get(x.contentWindow)==='ready')?'ready':'waiting'};</script></head>
  <body><main><small>Sive · ${saved ? '收藏快照' : '分析快照'} · ${escape(run.sourceName)} · ${escape(updatedAt)} · ${escape(run.modelName)}</small>
  <h1>${escape(title)}</h1>${title !== run.question ? `<p>分析问题：${escape(run.question)}</p>` : ''}${renderMarkdown(output.text || (savedOutput ? '此收藏快照未包含文字总结，请查看保存的计算数据与图表。' : '本次分析未生成文字总结。'))}
  ${output.warning ? `<p>${escape(output.warning)}</p>` : ''}
  ${charts.join('')}
  <h2>计算依据</h2><p>业务口径：${escape(run.semantic || '未提供')}</p>
  ${output.results.map(({ id, result }) => `<h3>${escape(result.query)}</h3><small>结果编号：${escape(id)}</small><pre>${escape(result.sql)}</pre>${result.truncated ? '<p>以下数据为截断后的结果快照，并非完整数据。</p>' : ''}${dataTable(result)}`).join('')}
  ${tools.length ? `<h2>工具调用</h2><pre>${escape(JSON.stringify(tools, null, 2))}</pre>` : ''}
  <h2>${savedOutput ? '原始分析执行过程' : '执行过程'}</h2>${run.events
    .filter(isAnalysisEvent)
    .map(
      (e) =>
        `<p><small>${escape(e.at)}</small> ${escape(e.label)}${e.durationMs === undefined ? '' : ` · ${(e.durationMs / 1000).toFixed(1)} 秒`}${e.detail ? ` · ${escape(e.detail)}` : ''}</p>`,
    )
    .join('')}
  <footer><small>${saved ? '导出内容为当前收藏的快照，不会重新查询数据或调用模型。' : '导出内容为分析时的快照。'}AI 结论请结合计算依据核对。</small></footer></main></body></html>`;
}
