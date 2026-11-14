import { access, constants } from 'node:fs/promises';
import path from 'node:path';
import type { DataSourceConfig } from '@antv/ava';

export function localFilePath(source: DataSourceConfig) {
  if (['csv-file', 'json-file', 'parquet', 'excel'].includes(source.type) && 'path' in source.options) {
    const file = source.options.path;
    if (typeof file === 'string' && !/^https?:\/\//i.test(file)) return file;
  }
  return undefined;
}

export function localSource(file: string): DataSourceConfig {
  file = path.resolve(file);
  switch (path.extname(file).toLowerCase()) {
    case '.csv':
      return { type: 'csv-file', options: { path: file } };
    case '.json':
      return { type: 'json-file', options: { path: file } };
    case '.parquet':
      return { type: 'parquet', options: { path: file } };
    case '.xlsx':
      return { type: 'excel', options: { path: file } };
    default:
      throw new Error('请选择 CSV、JSON、XLSX 或 Parquet 文件。');
  }
}

export async function checkLocalFile(file: string) {
  try {
    await access(file, constants.R_OK);
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    throw new Error(
      code === 'ENOENT' || code === 'ENOTDIR'
        ? '源文件不存在，可能已移动、改名或删除。请重新定位文件。'
        : '无法读取源文件，请检查文件权限或重新定位文件。',
    );
  }
}
