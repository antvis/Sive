import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { BrowserWindow, ClipboardItem, clipboard, dialog } from 'electron';
import { SNIPPET_EXPORT_WIDTH, snippetExportRenderedSchema } from '@shared/api';
import type { SnippetExportInput, SnippetExportRendered } from '@shared/api';
import { loadRenderer } from '../windows';

export async function exportSnippet(input: SnippetExportInput, parent: BrowserWindow) {
  const { image, title } = await captureSnippet(input, parent);

  if (input.target === 'clipboard') {
    await clipboard.write([new ClipboardItem({ 'image/png': new Blob([new Uint8Array(image)]) })]);
    return true;
  }

  const name = title
    .replace(/[<>:"/\\|?*\p{Cc}]/gu, ' ')
    .trim()
    .slice(0, 80)
    .trim();
  const result = await dialog.showSaveDialog(parent, {
    title: '保存 Snippet 图片',
    defaultPath: `Snippet${name ? ` - ${name}` : ''}.png`,
    filters: [{ name: 'PNG 图片', extensions: ['png'] }],
  });
  if (result.canceled || !result.filePath) return false;

  await writeFile(result.filePath, image);
  return true;
}

// A separate renderer keeps capture independent of the dialog's scroll position
// and uses the same Chromium layout engine as the visible preview.
async function captureSnippet(input: SnippetExportInput, parent: BrowserWindow) {
  const window = new BrowserWindow({
    show: false,
    width: SNIPPET_EXPORT_WIDTH,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      additionalArguments: ['--snippet-export'],
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      backgroundThrottling: false,
      partition: 'snippet-export',
    },
  });
  const contents = window.webContents;
  contents.setWindowOpenHandler(() => ({ action: 'deny' }));
  contents.on('will-navigate', (event) => event.preventDefault());
  contents.session.setPermissionRequestHandler((_contents, _permission, callback) => callback(false));

  let timer: ReturnType<typeof setTimeout>;
  let abort: (error: Error) => void;
  const failed = new Promise<never>((_resolve, reject) => {
    abort = reject;
    timer = setTimeout(() => reject(new Error('生成图片超时，请稍后重试。')), 20000);
  });

  const closed = () => abort(new Error('导出窗口已关闭。'));

  const crashed = () => abort(new Error('导出页面异常退出，请重试。'));
  parent.once('closed', closed);
  window.once('closed', closed);
  contents.once('render-process-gone', crashed);

  const capture = async () => {
    contents.ipc.handle('snippetExport:getRenderData', async () => {
      contents.debugger.attach('1.3');
      await contents.debugger.sendCommand('Emulation.setDeviceMetricsOverride', {
        width: SNIPPET_EXPORT_WIDTH,
        height: 600,
        deviceScaleFactor: 2,
        mobile: false,
      });
      return input;
    });
    const rendered = new Promise<SnippetExportRendered>((resolve, reject) => {
      contents.ipc.once('snippetExport:renderComplete', (_event, result: unknown) => {
        const parsed = snippetExportRenderedSchema.safeParse(result);
        if (parsed.success) resolve(parsed.data);
        else reject(new Error('图片尺寸超出支持范围或页面未正确渲染。'));
      });
    });
    const [, result] = await Promise.all([loadRenderer(window, 'snippet-export'), rendered]);
    if ('error' in result) throw new Error(result.error);
    const { data: png } = await contents.debugger.sendCommand('Page.captureScreenshot', {
      format: 'png',
      fromSurface: true,
      captureBeyondViewport: true,
      clip: { x: 0, y: 0, width: SNIPPET_EXPORT_WIDTH, height: result.height, scale: 1 },
    });
    return { image: Buffer.from(png, 'base64'), title: result.title };
  };

  try {
    return await Promise.race([capture(), failed]);
  } finally {
    clearTimeout(timer!);
    parent.removeListener('closed', closed);
    // The owned window disposes its WebContents, scoped IPC and debugger together.
    if (!window.isDestroyed()) window.destroy();
  }
}
