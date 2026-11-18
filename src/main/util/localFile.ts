import { access, constants } from 'node:fs/promises';
import path from 'node:path';
import type { DataSourceConfig } from '@antv/ava';
import { FILE_SOURCES } from '@shared/dataSource';

export function localFilePath(source: DataSourceConfig) {
  if (FILE_SOURCES.some((fileSource) => fileSource.type === source.type) && 'path' in source.options) {
    const file = source.options.path;
    if (typeof file === 'string' && !/^https?:\/\//i.test(file)) return file;
  }
  return undefined;
}

export function localSource(file: string): DataSourceConfig {
  file = path.resolve(file);
  const extension = path.extname(file).slice(1).toLowerCase();
  const source = FILE_SOURCES.find((source) =>
    source.action.extensions.some((supported) => supported === extension),
  );
  if (!source) throw new Error(`请选择 ${FILE_SOURCES.map((source) => source.label).join('、')} 文件。`);
  return { type: source.type, options: { path: file } };
}

export async function checkLocalFile(file: string) {
  try {
    await access(file, constants.R_OK);
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    throw new Error(
      code === 'ENOENT' || code === 'ENOTDIR'
        ? '源文件不存在，可能已移动、改名或删除。请检查原文件或重新导入。'
        : '无法读取源文件，请检查文件权限。',
    );
  }
}
