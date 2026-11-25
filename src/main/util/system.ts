import { mkdir, stat, statfs } from 'node:fs/promises';
import path from 'node:path';
import { app, session, shell } from 'electron';
import { DB_FILE_NAME } from '../db/repository/db-connection';

const REPOSITORY_URL = 'https://github.com/antvis/Sive';
const RELEASE_URL = `${REPOSITORY_URL}/releases/latest`;
const ALLOWED_URLS = new Set([
  REPOSITORY_URL,
  RELEASE_URL,
  'https://ava.antv.vision/documentation/analysis/strategies/',
  'https://ava.antv.vision/documentation/engines/duckdb/',
]);

function cacheDirectory() {
  return path.join(app.getPath('sessionData'), 'Cache');
}

async function getCacheInfo() {
  const cachePath = cacheDirectory();
  await mkdir(cachePath, { recursive: true });
  const [usedBytes, fileSystem] = await Promise.all([
    session.defaultSession.getCacheSize(),
    statfs(cachePath),
  ]);
  return { path: cachePath, usedBytes, freeBytes: fileSystem.bavail * fileSystem.bsize };
}

async function getDataStorageInfo() {
  const directory = app.getPath('userData');
  const filePath = path.join(directory, DB_FILE_NAME);
  const sizes = await Promise.all(
    ['', '-wal', '-shm'].map(async (suffix) => {
      try {
        return (await stat(filePath + suffix)).size;
      } catch (error) {
        if (suffix && (error as NodeJS.ErrnoException).code === 'ENOENT') return 0;
        throw error;
      }
    }),
  );
  return { path: filePath, directory, sizeBytes: sizes.reduce((total, size) => total + size, 0) };
}

/**
 * Get the storage information of the application, including cache and data storage.
 * @returns An object containing cache and data storage information.
 * - cache: { path: string, usedBytes: number, freeBytes: number }
 * - data: { path: string, directory: string, sizeBytes: number }
 */
export async function getStorageInfo() {
  const [cache, data] = await Promise.all([getCacheInfo(), getDataStorageInfo()]);
  return { cache, data };
}

/**
 * Open a directory or URL in the system's default application.
 * @remarks
 * - For directories, only the cache and user data directories are allowed to be opened.
 * - For URLs, only a predefined set of URLs are allowed to be opened.
 * @throws Will throw an error if the type is not 'directory' or 'url', or if the target is not allowed.
 */
export async function systemOpen(type: 'directory' | 'url', target: string) {
  if (type === 'directory') {
    if (![cacheDirectory(), app.getPath('userData')].includes(target)) throw new Error('不支持打开该目录。');
    await mkdir(target, { recursive: true });
    const error = await shell.openPath(target);
    if (error) throw new Error(error);
    return;
  }
  if (type === 'url') {
    if (!ALLOWED_URLS.has(target)) throw new Error('不支持打开该链接。');
    await shell.openExternal(target);
    return;
  }
  throw new Error('不支持的打开类型。');
}
