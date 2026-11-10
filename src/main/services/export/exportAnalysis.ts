import { BrowserWindow, dialog } from 'electron';
import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import type { API } from '@shared/contracts';
import { WorkbenchError } from '@shared/errors';
import type { AnalysisRecordService } from '../analysis/AnalysisRecordService';
import type { ThemeSettings } from '@shared/theme';
import { analysisHTML } from './analysisHtml';

// Leave room below common 255-byte filename limits, including the extension.
// Count UTF-8 bytes: 100 Chinese characters can already exceed that limit.
function exportFilename(title: string, format: 'html' | 'pdf' | 'png') {
  const extension = `.${format}`;
  const cleaned = title
    .normalize('NFC')
    .replace(/[<>:"/\\|?*\x00-\x1f\x7f-\x9f]/g, '_')
    .trim();
  let name = '';
  let bytes = Buffer.byteLength(extension, 'utf8');
  for (const { segment } of new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(cleaned)) {
    const size = Buffer.byteLength(segment, 'utf8');
    // Reserve one byte for the reserved-name prefix below.
    if (bytes + size > 179) break;
    name += segment;
    bytes += size;
  }
  name =
    name
      .replace(/[. ]+$/g, '')
      .replace(/^\.+/, '')
      .trim() || 'Sive-分析';
  // Windows reserves these names even when followed by an extension.
  if (/^(con|prn|aux|nul|com[1-9¹²³]|lpt[1-9¹²³])(?:\.|$)/i.test(name)) name = `_${name}`;
  return name + extension;
}

export async function exportAnalysis(
  win: BrowserWindow,
  records: AnalysisRecordService,
  theme: ThemeSettings,
  root: string,
  id: string,
  format: Parameters<API['analysisExport']>[1],
  saved = false,
) {
  const run = records.run(id);
  if (saved && !run.snippet) throw new WorkbenchError('CONFLICT', '此分析已从收藏中移除');
  const html = await analysisHTML(run, theme, saved);
  const dest = await dialog.showSaveDialog(win, {
    defaultPath: exportFilename((saved && run.snippet?.title) || run.question, format),
    filters: [{ name: format.toUpperCase(), extensions: [format] }],
  });
  if (dest.canceled || !dest.filePath) return false;
  if (format === 'html') fs.writeFileSync(dest.filePath, html);
  else {
    const print = new BrowserWindow({
      show: false,
      width: 1120,
      height: 900,
      webPreferences: {
        sandbox: true,
        contextIsolation: true,
        nodeIntegration: false,
        backgroundThrottling: false,
      },
    });
    const previewFile = path.join(root, `export-${randomUUID()}.html`);
    try {
      fs.writeFileSync(previewFile, html, { mode: 0o600 });
      await print.loadFile(previewFile);
      let ready = false;
      for (let i = 0; i < 40; i++) {
        const status = await print.webContents.executeJavaScript('window.analysisReady()');
        if (status === 'error')
          throw new WorkbenchError('INVALID_INPUT', '图表未能渲染，请重新分析或导出计算数据。');
        if (status === 'ready') {
          ready = true;
          break;
        }
        await new Promise((r) => setTimeout(r, 250));
      }
      if (!ready) throw new WorkbenchError('INVALID_INPUT', '图表渲染超时，请重试导出。');
      if (format === 'pdf') {
        const pdf = await print.webContents.printToPDF({ printBackground: true, pageSize: 'A4' });
        fs.writeFileSync(dest.filePath, pdf);
      } else {
        const height = Math.ceil(
          await print.webContents.executeJavaScript('document.documentElement.scrollHeight'),
        );
        print.setContentSize(1120, height);
        await new Promise((r) => setTimeout(r, 600));
        const image = await print.webContents.capturePage();
        fs.writeFileSync(dest.filePath, image.toPNG());
      }
    } finally {
      print.destroy();
      fs.rmSync(previewFile, { force: true });
    }
  }
  return true;
}
