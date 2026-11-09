import { BrowserWindow, dialog } from 'electron';
import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import type { API } from '@shared/contracts';
import { WorkbenchError } from '@shared/errors';
import type { ConversationService } from '@main/db/repository/ConversationService';
import type { ThemeSettings } from '@shared/theme';
import { analysisHTML } from './analysisHtml';
import { exportFilename } from './exportFilename';

export async function exportAnalysis(
  win: BrowserWindow,
  conversations: ConversationService,
  theme: ThemeSettings,
  root: string,
  id: string,
  format: Parameters<API['exportAnalysis']>[1],
  saved = false,
) {
  const run = conversations.run(id);
  if (saved && !run.savedAt) throw new WorkbenchError('CONFLICT', '此分析已从收藏中移除');
  const html = await analysisHTML(run, theme, saved);
  const dest = await dialog.showSaveDialog(win, {
    defaultPath: exportFilename((saved && run.savedTitle) || run.question, format),
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
