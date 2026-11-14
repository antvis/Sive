import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { BrowserWindow, dialog } from 'electron';
import type { ExportFormat, ResultDocument } from '@shared/results';
import { CHART_RENDER_TIMEOUT_MS, resultHTML } from './html';

export function exportFilename(title: string, format: ExportFormat): string {
  const cleaned = title
    .normalize('NFC')
    // 文件名不能包含控制字符。
    // oxlint-disable-next-line no-control-regex
    .replace(/[<>:"/\\|?*\x00-\x1f\x7f]/g, '_')
    .replace(/[. ]+$/g, '')
    .trim();
  let name = '';
  for (const character of cleaned) {
    if (Buffer.byteLength(name + character, 'utf8') > 160) break;
    name += character;
  }
  name = name.replace(/[. ]+$/g, '') || 'Sive-分析';
  if (/^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(name)) name = `_${name}`;
  return `${name}.${format}`;
}

export async function exportResult(
  owner: BrowserWindow,
  document: ResultDocument,
  format: ExportFormat,
): Promise<boolean> {
  const destination = await dialog.showSaveDialog(owner, {
    defaultPath: exportFilename(document.title, format),
    filters: [{ name: format.toUpperCase(), extensions: [format] }],
  });
  if (destination.canceled || !destination.filePath) return false;
  const directory = await mkdtemp(path.join(os.tmpdir(), 'sive-export-'));
  let window: BrowserWindow | undefined;
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const file = path.join(directory, 'result.html');
    await writeFile(file, await resultHTML(document), { mode: 0o600 });
    window = new BrowserWindow({
      show: false,
      width: 1120,
      height: 900,
      webPreferences: {
        sandbox: true,
        contextIsolation: true,
        nodeIntegration: false,
        backgroundThrottling: false,
        partition: `sive-export-${path.basename(directory)}`,
      },
    });
    window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
    window.webContents.on('will-navigate', (event) => event.preventDefault());
    window.webContents.session.setPermissionRequestHandler((_contents, _permission, callback) =>
      callback(false),
    );
    window.webContents.session.setPermissionCheckHandler(() => false);
    window.webContents.session.webRequest.onBeforeRequest(
      { urls: ['http://*/*', 'https://*/*'] },
      (_details, callback) => callback({ cancel: true }),
    );
    const exportWindow = window;
    const chartCount = document.sections.filter((section) => section.type === 'chart').length;

    const rendering = async () => {
      await exportWindow.loadFile(file);
      await exportWindow.webContents.executeJavaScript('window.siveExportReady');
    };
    await Promise.race([
      rendering(),
      new Promise<never>((_resolve, reject) => {
        timer = setTimeout(
          () => reject(new Error('导出渲染超时，请重试。')),
          30000 + chartCount * CHART_RENDER_TIMEOUT_MS,
        );
      }),
    ]);
    clearTimeout(timer);
    if (format === 'html') {
      const html: string = await window.webContents.executeJavaScript(
        "document.querySelectorAll('script').forEach(script => script.remove()); '<!doctype html>' + document.documentElement.outerHTML",
      );
      await writeFile(destination.filePath, html, 'utf8');
    } else if (format === 'pdf') {
      await writeFile(
        destination.filePath,
        await window.webContents.printToPDF({
          printBackground: true,
          pageSize: 'A4',
          preferCSSPageSize: true,
        }),
      );
    } else {
      const height: number = await window.webContents.executeJavaScript(
        'Math.ceil(document.documentElement.scrollHeight)',
      );
      if (height > 16000) throw new Error('结果过长，无法导出为单张 PNG，请选择 PDF 或 HTML。');
      window.setContentSize(1120, height);
      await window.webContents.executeJavaScript(
        'new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))',
      );
      const image = await window.webContents.capturePage({ x: 0, y: 0, width: 1120, height });
      if (image.isEmpty()) throw new Error('导出图像为空，请重试。');
      await writeFile(destination.filePath, image.toPNG());
    }
    return true;
  } finally {
    clearTimeout(timer);
    window?.destroy();
    await rm(directory, { recursive: true, force: true });
  }
}
