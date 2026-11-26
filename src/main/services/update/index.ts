import { app, net } from 'electron';
import type { UpdateResult } from '@shared/api';

const UPDATE_ERROR_MESSAGES = {
  checkFailed: '检查更新失败',
  invalidVersion: '版本信息无效，无法检查更新。',
  timeout: '连接 GitHub 超时，请检查网络连接后重试。',
  network: '无法连接 GitHub，请检查网络或代理设置后重试。',
  releaseNotFound: '暂未找到可用的正式版本，请稍后再试。',
  rateLimited: 'GitHub 请求次数已达上限，请稍后再试。',
  unavailable: 'GitHub 暂时无法提供版本信息，请稍后重试。',
  invalidResponse: '无法读取 GitHub 版本信息，请稍后重试。',
  invalidRelease: '未获取到最新正式版本信息。',
};

const RELEASE_API_URL = 'https://api.github.com/repos/antvis/Sive/releases/latest';
const CHECK_INTERVAL = 24 * 60 * 60 * 1000;

function parseVersion(version: string) {
  const match = /^v?(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-([\da-zA-Z.-]+))?(?:\+[\da-zA-Z.-]+)?$/.exec(
    version,
  );
  if (!match) throw new Error(UPDATE_ERROR_MESSAGES.invalidVersion);

  return { parts: match.slice(1, 4).map(Number), prerelease: match[4] };
}

export class UpdateService {
  private request: Promise<UpdateResult> | undefined;

  private timer: ReturnType<typeof setTimeout> | undefined;

  private enabled = false;

  private pending: UpdateResult | null = null;

  private notifiedVersions = new Set<string>();

  private listener: (() => void) | undefined;

  onUpdateAvailable(listener: () => void) {
    this.listener = listener;
  }

  check(): Promise<UpdateResult> {
    this.request ??= this.fetchLatest().finally(() => {
      this.request = undefined;
    });
    return this.request;
  }

  private async fetchLatest(): Promise<UpdateResult> {
    const signal = AbortSignal.timeout(10000);
    const response = await net
      .fetch(RELEASE_API_URL, {
        headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'Sive' },
        signal,
      })
      .catch(() => {
        throw new Error(signal.aborted ? UPDATE_ERROR_MESSAGES.timeout : UPDATE_ERROR_MESSAGES.network);
      });
    if (response.status === 404) throw new Error(UPDATE_ERROR_MESSAGES.releaseNotFound);
    if (
      response.status === 429 ||
      (response.status === 403 && response.headers.get('x-ratelimit-remaining') === '0')
    )
      throw new Error(UPDATE_ERROR_MESSAGES.rateLimited);
    if (!response.ok) throw new Error(UPDATE_ERROR_MESSAGES.unavailable);

    const release = (await response.json().catch(() => {
      throw new Error(signal.aborted ? UPDATE_ERROR_MESSAGES.timeout : UPDATE_ERROR_MESSAGES.invalidResponse);
    })) as {
      tag_name?: string;
      prerelease?: boolean;
      draft?: boolean;
    } | null;
    if (typeof release?.tag_name !== 'string' || release.prerelease || release.draft)
      throw new Error(UPDATE_ERROR_MESSAGES.invalidRelease);

    const currentVersion = app.getVersion();
    const latestVersion = release.tag_name.replace(/^v/, '');
    const latest = parseVersion(latestVersion);
    const current = parseVersion(currentVersion);
    if (latest.prerelease) throw new Error(UPDATE_ERROR_MESSAGES.invalidRelease);

    const difference = latest.parts
      .map((part, index) => part - current.parts[index]!)
      .find((value) => value !== 0);
    const hasUpdate = difference === undefined ? Boolean(current.prerelease) : difference > 0;
    return { currentVersion, latestVersion, hasUpdate };
  }

  setAutomatic(enabled: boolean) {
    const active = app.isPackaged && enabled;
    if (this.enabled === active) return;

    this.enabled = active;
    clearTimeout(this.timer);
    this.pending = null;
    if (active) this.timer = setTimeout(() => void this.checkAutomatically(), 10000);
  }

  private async checkAutomatically() {
    try {
      const result = await this.check();
      if (this.enabled && result.hasUpdate && !this.notifiedVersions.has(result.latestVersion)) {
        this.pending = result;
        this.listener?.();
      }
    } catch {
      // Background failures stay silent; the manual check reports errors to the user.
    } finally {
      if (this.enabled) {
        clearTimeout(this.timer);
        this.timer = setTimeout(() => void this.checkAutomatically(), CHECK_INTERVAL);
      }
    }
  }

  takeNotification(): UpdateResult | null {
    const result = this.pending;
    this.pending = null;
    if (result) this.notifiedVersions.add(result.latestVersion);
    return result;
  }
}
