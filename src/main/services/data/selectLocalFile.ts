import type { SettingsService } from '../settings/SettingsService';
import { dialog, type BrowserWindow } from 'electron';
import fs from 'node:fs';
import path from 'node:path';
import type { API } from '@shared/contracts';

export async function selectLocalFile(
  win: BrowserWindow,
  settings: SettingsService,
  format?: Parameters<API['importData']>[0],
) {
  let defaultPath: string | undefined;
  try {
    const directory = settings.lastImportDirectory;
    if (directory && fs.statSync(directory).isDirectory()) defaultPath = directory;
  } catch {
    // An unavailable directory should not prevent opening the picker.
  }
  const result = await dialog.showOpenDialog(win, {
    defaultPath,
    properties: ['openFile'],
    filters: [
      {
        name: format ? `${format.toUpperCase()} 文件` : '数据文件',
        extensions: format ? [format] : ['csv', 'xlsx', 'json', 'parquet'],
      },
    ],
  });
  if (result.canceled || !result.filePaths[0]) return null;
  const file = result.filePaths[0];
  settings.rememberImportDirectory(path.dirname(file));
  return file;
}
