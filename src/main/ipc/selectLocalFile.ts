import path from 'node:path';
import { BrowserWindow, dialog } from 'electron';
import type { IpcMainInvokeEvent } from 'electron';
import { LOCAL_FILE_FORMATS } from '@shared/api';
import type { LocalFileFormat } from '@shared/api';

export async function selectLocalFile(
  event: IpcMainInvokeEvent,
  options: { title: string; defaultPath?: string; format?: LocalFileFormat },
) {
  const { title, defaultPath, format } = options;
  const window = BrowserWindow.fromWebContents(event.sender);
  if (!window) throw new Error('应用窗口已关闭。');
  const dialogOptions = {
    title,
    defaultPath,
    properties: ['openFile' as const],
    filters: [
      {
        name: format ? `${format.toUpperCase()} 文件` : '数据文件',
        extensions: format ? [format] : [...LOCAL_FILE_FORMATS],
      },
    ],
  };
  const result = await dialog.showOpenDialog(window, dialogOptions);
  const file = result.filePaths[0];
  if (result.canceled || !file) return null;
  if (format && path.extname(file).toLowerCase() !== `.${format}`)
    throw new Error(`请选择 ${format.toUpperCase()} 文件。`);
  return file;
}
