import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { shell } from 'electron';

vi.mock('electron', () => ({ shell: { openExternal: vi.fn() } }));

import {
  cancelGitHubConnect,
  connectGitHub,
  listGitHubRepositories,
  waitForGitHubConnect,
} from '../../../src/main/util/github/client';

const connectionId = '00000000-0000-4000-8000-000000000001';
const device = {
  device_code: 'device-code',
  user_code: 'ABCD-EFGH',
  verification_uri: 'https://github.com/login/device',
  expires_in: 900,
  interval: 0,
};

function response(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('GitHub Device Flow', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(async () => {
    await cancelGitHubConnect(connectionId);
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it('polls until authorized and returns the account', async () => {
    fetchMock
      .mockResolvedValueOnce(response(device))
      .mockResolvedValueOnce(response({ error: 'authorization_pending' }, 400))
      .mockResolvedValueOnce(response({ access_token: 'github-token' }))
      .mockResolvedValueOnce(response({ login: 'octocat' }));

    const authorization = await connectGitHub(connectionId);
    const account = await waitForGitHubConnect(connectionId);

    expect(authorization).toEqual({
      userCode: 'ABCD-EFGH',
      verificationUri: 'https://github.com/login/device',
    });
    expect(account).toEqual({ token: 'github-token', login: 'octocat' });
    expect(shell.openExternal).toHaveBeenCalledWith('https://github.com/login/device');
    const tokenRequest = fetchMock.mock.calls[2][1] as RequestInit;
    expect(tokenRequest.body).toBeInstanceOf(URLSearchParams);
    expect((tokenRequest.body as URLSearchParams).has('client_secret')).toBe(false);
  });

  it('cancels the device code request before opening the browser', async () => {
    fetchMock.mockImplementationOnce(
      (_url, init: RequestInit) =>
        new Promise((_resolve, reject) => {
          init.signal?.addEventListener('abort', () => reject(new Error('aborted')), { once: true });
        }),
    );

    const starting = connectGitHub(connectionId);
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledOnce());
    await cancelGitHubConnect(connectionId);

    await expect(starting).rejects.toThrow('GitHub 授权已取消。');
    expect(shell.openExternal).not.toHaveBeenCalled();
  });

  it('stops when the user denies authorization', async () => {
    fetchMock
      .mockResolvedValueOnce(response(device))
      .mockResolvedValueOnce(response({ error: 'access_denied' }, 400));

    await connectGitHub(connectionId);

    await expect(waitForGitHubConnect(connectionId)).rejects.toThrow('GitHub 授权已拒绝。');
  });

  it('cancels polling', async () => {
    fetchMock
      .mockResolvedValueOnce(response({ ...device, interval: 60 }))
      .mockResolvedValueOnce(response({ error: 'authorization_pending' }, 400));

    await connectGitHub(connectionId);
    const waiting = waitForGitHubConnect(connectionId);
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    await cancelGitHubConnect(connectionId);

    await expect(waiting).rejects.toThrow('GitHub 授权已取消。');
  });

  it('lists repositories with the authorized account', async () => {
    fetchMock.mockResolvedValueOnce(
      response({
        total_count: 1,
        incomplete_results: false,
        items: [{ full_name: 'octocat/Hello-World', description: null, private: true }],
      }),
    );

    const result = await listGitHubRepositories(
      { connectionId, page: 1 },
      { token: 'github-token', login: 'octocat' },
    );

    expect(result.repositories).toEqual([
      { fullName: 'octocat/Hello-World', description: '', private: true },
    ]);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(new URL(url).searchParams.get('q')).toBe('user:octocat fork:true');
    expect(init.headers).toMatchObject({ Authorization: 'Bearer github-token' });
  });
});
