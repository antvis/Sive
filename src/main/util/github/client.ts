import { i18n } from '../i18n';
import { setTimeout as sleep } from 'node:timers/promises';
import { shell } from 'electron';
import { z } from 'zod';
import { githubRepositoryListSchema } from '@shared/github';
import type { GitHubRepositoryPage, GitHubRepositoryListInput } from '@shared/github';

const GITHUB_CLIENT_ID = 'Ov23li2pmlBDHAlhclgw';
const DEVICE_CODE_URL = 'https://github.com/login/device/code';
const ACCESS_TOKEN_URL = 'https://github.com/login/oauth/access_token';
const VERIFICATION_URI = 'https://github.com/login/device';

const deviceCodeSchema = z.object({
  device_code: z.string().min(1),
  user_code: z.string().min(1),
  verification_uri: z.literal(VERIFICATION_URI),
  expires_in: z.number().int().positive(),
  interval: z.number().int().nonnegative(),
});

const tokenSchema = z.object({
  access_token: z.string().min(1).optional(),
  error: z.string().optional(),
});

type PendingAuthorization = {
  id: string;
  controller: AbortController;
  deviceCode: string;
  interval: number;
  expiresAt: number;
};

let authorizing: PendingAuthorization | undefined;

function form(values: Record<string, string>) {
  return {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(values),
  };
}

async function json(response: Response) {
  const payload: unknown = await response.json().catch(() => null);
  if (!payload) throw new Error(i18n('errors.github.invalidResponse'));
  return payload;
}

export async function connectGitHub(id: string) {
  if (authorizing) throw new Error(i18n('errors.github.authorizationInProgress'));
  const controller = new AbortController();
  const current: PendingAuthorization = { id, controller, deviceCode: '', interval: 0, expiresAt: 0 };
  authorizing = current;
  try {
    const response = await fetch(DEVICE_CODE_URL, {
      ...form({ client_id: GITHUB_CLIENT_ID, scope: 'repo read:user' }),
      signal: AbortSignal.any([controller.signal, AbortSignal.timeout(30000)]),
    });
    if (!response.ok) throw new Error(i18n('errors.github.deviceAuthorizationFailed', [response.status]));
    const data = deviceCodeSchema.parse(await json(response));
    Object.assign(current, {
      deviceCode: data.device_code,
      interval: data.interval,
      expiresAt: Date.now() + data.expires_in * 1000,
    });
    current.controller.signal.throwIfAborted();
    await shell.openExternal(data.verification_uri);
    return { userCode: data.user_code, verificationUri: data.verification_uri };
  } catch (error) {
    if (authorizing?.id === id) authorizing = undefined;
    if (controller.signal.aborted) throw new Error(i18n('errors.github.authorizationCancelled'));
    throw error;
  }
}

export async function waitForGitHubConnect(id: string) {
  const current = authorizing;
  if (!current || current.id !== id) throw new Error(i18n('errors.github.sessionNotFound'));
  try {
    while (Date.now() < current.expiresAt) {
      const response = await fetch(ACCESS_TOKEN_URL, {
        ...form({
          client_id: GITHUB_CLIENT_ID,
          device_code: current.deviceCode,
          grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
        }),
        signal: AbortSignal.any([current.controller.signal, AbortSignal.timeout(30000)]),
      });
      const data = tokenSchema.parse(await json(response));
      if (data.access_token) {
        const accountResponse = await fetch('https://api.github.com/user', {
          headers: { Authorization: `Bearer ${data.access_token}`, Accept: 'application/vnd.github+json' },
          signal: AbortSignal.any([current.controller.signal, AbortSignal.timeout(30000)]),
        });
        if (!accountResponse.ok)
          throw new Error(i18n('errors.github.accountRequestFailed', [accountResponse.status]));
        const account = z.object({ login: z.string().min(1) }).parse(await json(accountResponse));
        return { token: data.access_token, login: account.login };
      }
      if (data.error === 'authorization_pending') {
        await sleep(current.interval * 1000, undefined, { signal: current.controller.signal });
      } else if (data.error === 'slow_down') {
        current.interval += 5;
        await sleep(current.interval * 1000, undefined, { signal: current.controller.signal });
      } else if (data.error === 'access_denied') {
        throw new Error(i18n('errors.github.authorizationDenied'));
      } else if (data.error === 'expired_token') {
        throw new Error(i18n('errors.github.deviceCodeExpired'));
      } else {
        throw new Error(i18n('errors.github.authorizationFailed'));
      }
    }
    throw new Error(i18n('errors.github.deviceCodeExpired'));
  } catch (error) {
    if (current.controller.signal.aborted) throw new Error(i18n('errors.github.authorizationCancelled'));
    throw error;
  } finally {
    if (authorizing === current) authorizing = undefined;
  }
}

export async function cancelGitHubConnect(id: string) {
  if (authorizing?.id !== id) return;
  const current = authorizing;
  authorizing = undefined;
  current.controller.abort();
}

export async function listGitHubRepositories(
  input: GitHubRepositoryListInput,
  session: { token: string; login: string },
): Promise<GitHubRepositoryPage> {
  const { page } = githubRepositoryListSchema.parse(input);
  const query = new URLSearchParams({
    q: `user:${session.login} fork:true`,
    page: String(page),
    per_page: '50',
  });
  const response = await fetch(`https://api.github.com/search/repositories?${query}`, {
    headers: { Authorization: `Bearer ${session.token}`, Accept: 'application/vnd.github+json' },
    signal: AbortSignal.timeout(30000),
  });
  if (!response.ok) throw new Error(i18n('errors.github.repositoriesRequestFailed', [response.status]));
  const data = z
    .object({
      total_count: z.number().int().nonnegative(),
      incomplete_results: z.boolean(),
      items: z.array(
        z.object({
          full_name: z.string().min(1),
          description: z.string().nullish(),
          private: z.boolean(),
        }),
      ),
    })
    .parse(await json(response));
  return {
    repositories: data.items.map((repo) => ({
      fullName: repo.full_name,
      description: repo.description ?? '',
      private: repo.private,
    })),
    hasMore: data.items.length === 50 && page * 50 < Math.min(data.total_count, 1000),
    incomplete: data.incomplete_results || data.total_count > 1000,
  };
}
