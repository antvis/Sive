import { mkdir, stat, statfs } from 'node:fs/promises';
import path from 'node:path';
import { app, net, session, shell } from 'electron';
import { DB_FILE_NAME } from '../db/repository/db-connection';

const REPOSITORY_URL = 'https://github.com/antvis/Sive';
const RELEASE_API_URL = 'https://api.github.com/repos/antvis/Sive/releases/latest';
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

function isNewerVersion(latest: string, current: string) {
  const left = latest.replace(/^v/, '').split('.').map(Number);
  const right = current.replace(/^v/, '').split('.').map(Number);
  for (let index = 0; index < 3; index += 1) {
    const difference = (left[index] || 0) - (right[index] || 0);
    if (difference) return difference > 0;
  }
  return false;
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

export function clearCache() {
  return session.defaultSession.clearCache();
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

/**
 * Check for updates of the application by querying the GitHub releases API.
 * If a newer version is found, it will open the release page in the default browser.
 * @throws Will throw an error if the update check fails or if the latest version information cannot be retrieved.
 * @returns An object containing the current version, the latest version, and a boolean indicating if an update is available.
 * - currentVersion: string
 * - latestVersion: string
 * - hasUpdate: boolean
 */
export async function checkForUpdates() {
  const response = await net.fetch(RELEASE_API_URL, {
    headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'Sive' },
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) throw new Error('检查更新失败，请稍后重试。');
  const release = (await response.json()) as { tag_name?: string };
  if (!release.tag_name) throw new Error('未获取到最新版本信息。');
  const currentVersion = app.getVersion();
  const latestVersion = release.tag_name.replace(/^v/, '');
  const hasUpdate = isNewerVersion(latestVersion, currentVersion);
  if (hasUpdate) await systemOpen('url', RELEASE_URL);
  return { currentVersion, latestVersion, hasUpdate };
}
