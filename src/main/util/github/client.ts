import path from 'node:path';
import { access } from 'node:fs/promises';
import { app } from 'electron';
import { Client } from '@modelcontextprotocol/client';
import { StdioClientTransport, getDefaultEnvironment } from '@modelcontextprotocol/client/stdio';
import { z } from 'zod';
import { githubRepositoryListSchema } from '@shared/github';
import type { GitHubRepositoryPage, GitHubRepositoryListInput } from '@shared/github';

const readTools = ['get_me', 'list_issues', 'list_pull_requests', 'search_repositories'] as const;

type GitHubToolCall = (
  name: (typeof readTools)[number],
  args: Record<string, unknown>,
  signal?: AbortSignal,
) => Promise<unknown>;

type Session = { client: Client; controller: AbortController; login: string };

// The official server keeps OAuth credentials in memory for this app session only.
let session: Session | undefined;
let authorizing: (Session & { id: string }) | undefined;
let readers = 0;

async function closeSession(current: Session) {
  current.controller.abort();
  await current.client.close().catch(() => {});
}

async function callTool(
  current: Session,
  name: (typeof readTools)[number],
  args: Record<string, unknown>,
  signal?: AbortSignal,
  timeout = 60000,
) {
  if (!readTools.includes(name)) throw new Error('不支持的 GitHub 读取操作。');
  const combined = AbortSignal.any([current.controller.signal, ...(signal ? [signal] : [])]);
  try {
    combined.throwIfAborted();
    const result = await current.client.callTool({ name, arguments: args }, { signal: combined, timeout });
    const text = result.content
      .filter((item) => item.type === 'text')
      .map((item) => item.text)
      .join('\n');
    if (result.isError) throw new Error(text);
    return JSON.parse(text);
  } catch (error) {
    if (combined.aborted) throw new Error('GitHub 连接已取消，请重新连接。');
    throw error instanceof Error ? error : new Error(error instanceof Error ? error.message : '');
  }
}

export async function connectGitHubMcp(id: string) {
  if (authorizing) throw new Error('已有 GitHub 授权正在进行。');
  if (readers) throw new Error('GitHub 数据正在读取，请完成后重新连接。');
  const command = path.join(
    app.getAppPath(),
    'resources',
    'github-mcp',
    process.platform === 'win32' ? 'github-mcp-server.exe' : 'github-mcp-server',
  );
  const current = {
    id,
    client: new Client(
      { name: 'Sive', version: app.getVersion() },
      {
        supportedProtocolVersions: ['2025-06-18'],
      },
    ),
    controller: new AbortController(),
    login: '',
  };
  authorizing = current;
  current.client.onclose = () => {
    current.controller.abort();
    if (session === current) session = undefined;
  };
  try {
    await access(command).catch(() => {
      throw new Error('缺少 GitHub 连接组件，请按照开发说明准备或重新安装应用。');
    });
    current.controller.signal.throwIfAborted();
    await current.client.connect(
      new StdioClientTransport({
        command,
        args: ['stdio', '--read-only', '--tools', readTools.join(','), '--oauth-scopes', 'repo,read:user'],
        env: getDefaultEnvironment(),
        stderr: 'ignore',
        maxBufferSize: 16 * 1024 * 1024,
      }),
      { timeout: 10000, signal: current.controller.signal },
    );
    const account = z
      .object({ login: z.string().min(1) })
      .parse(await callTool(current, 'get_me', {}, current.controller.signal, 180000));
    current.controller.signal.throwIfAborted();
    current.login = account.login;
    const previous = session;
    session = current;
    if (previous) await closeSession(previous);
    current.controller.signal.throwIfAborted();
    return account;
  } catch {
    await closeSession(current);
    throw new Error('GitHub 连接未完成，请在浏览器中完成授权后重试。');
  } finally {
    if (authorizing === current) authorizing = undefined;
  }
}

export async function cancelGitHubConnect(id: string) {
  if (authorizing?.id === id) await closeSession(authorizing);
}

export async function withGitHubMcp<T>(
  operation: (call: GitHubToolCall) => Promise<T>,
  signal?: AbortSignal,
): Promise<T> {
  if (authorizing) throw new Error('请先完成 GitHub 浏览器授权。');
  const current = session;
  if (!current) throw new Error('请编辑 GitHub 数据源并重新连接。');
  signal?.throwIfAborted();
  readers++;
  try {
    return await operation((name, args, callSignal) =>
      callTool(
        current,
        name,
        args,
        AbortSignal.any([...(signal ? [signal] : []), ...(callSignal ? [callSignal] : [])]),
      ),
    );
  } finally {
    readers--;
  }
}

export async function listGitHubRepositories(
  input: GitHubRepositoryListInput,
): Promise<GitHubRepositoryPage> {
  const { page } = githubRepositoryListSchema.parse(input);
  return withGitHubMcp(async (call) => {
    const result = await call('search_repositories', {
      query: `user:${session!.login} fork:true`,
      page,
      perPage: 50,
      minimal_output: false,
    });
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
      .parse(result);
    return {
      repositories: data.items.map((repo) => ({
        fullName: repo.full_name,
        description: repo.description ?? '',
        private: repo.private,
      })),
      hasMore: data.items.length === 50 && page * 50 < Math.min(data.total_count, 1000),
      incomplete: data.incomplete_results || data.total_count > 1000,
    };
  }, AbortSignal.timeout(30000));
}
