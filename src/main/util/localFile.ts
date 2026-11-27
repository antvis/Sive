import { i18n } from './i18n';
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
  if (!source)
    throw new Error(
      i18n('errors.files.expectedFormat', [FILE_SOURCES.map((source) => i18n(source.labelKey)).join('、')]),
    );
  return { type: source.type, options: { path: file } };
}

export async function checkLocalFile(file: string) {
  try {
    await access(file, constants.R_OK);
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    throw new Error(
      code === 'ENOENT' || code === 'ENOTDIR'
        ? i18n('errors.files.sourceNotFound')
        : i18n('errors.files.permissionDenied'),
    );
  }
}
