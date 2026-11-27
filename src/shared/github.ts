import { z } from 'zod';

export const githubConnectionIdSchema = z.uuid();

export const githubRepositoryListSchema = z
  .object({
    connectionId: githubConnectionIdSchema,
    page: z.number().int().min(1).max(20).default(1),
  })
  .strict();

export type GitHubRepositoryListInput = z.input<typeof githubRepositoryListSchema>;

export type GitHubDeviceAuthorization = {
  userCode: string;
  verificationUri: string;
};

export type GitHubRepositoryPage = {
  repositories: { fullName: string; description: string; private: boolean }[];
  hasMore: boolean;
  incomplete: boolean;
};

export function githubRepository(value: string) {
  let repository = value.trim();
  if (repository.startsWith('https://')) {
    const url = new URL(repository);
    if (url.hostname !== 'github.com' || url.username || url.password || url.port) {
      throw new Error('请输入 github.com 的仓库地址。');
    }
    repository = url.pathname
      .replace(/^\//, '')
      .replace(/\/$/, '')
      .replace(/\/(issues|pulls)$/, '');
  }
  repository = repository.replace(/\.git$/, '');
  if (!/^[a-z\d](?:[a-z\d-]{0,38})\/[a-z\d_.-]+$/i.test(repository) || /\/(\.|\.\.)$/.test(repository)) {
    throw new Error('请输入 owner/repo 或 https://github.com/owner/repo。');
  }
  return repository;
}

export const githubSourceSchema = z
  .object({
    type: z.literal('github'),
    options: z
      .object({
        repository: z.string().trim().min(1).transform(githubRepository),
        token: z.string().min(1).optional(),
        since: z.iso.date().optional(),
        maxRecords: z.number().int().min(1).max(100000).default(10000),
        timeoutMs: z.number().int().min(1000).max(110000).default(60000),
      })
      .strip(),
  })
  .strict();
