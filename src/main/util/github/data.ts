import type { DataSourceConfig } from '@antv/ava';
import { z } from 'zod';
import type { GitHubSourceOptions } from '@shared/github';

type ToolCall = (
  name: 'list_issues' | 'list_pull_requests',
  args: Record<string, unknown>,
  signal: AbortSignal,
) => Promise<unknown>;

const itemSchema = z.object({
  number: z.number().int().positive(),
  title: z.string(),
  state: z.enum(['open', 'closed', 'OPEN', 'CLOSED']).transform((value) => value.toLowerCase()),
  user: z.object({ login: z.string() }).nullish(),
  labels: z.array(z.string()).default([]),
  assignees: z
    .array(z.string())
    .nullish()
    .transform((value) => value ?? []),
  created_at: z.iso.datetime({ offset: true }),
  updated_at: z.iso.datetime({ offset: true }),
  comments: z.number().int().nonnegative().nullish(),
  draft: z.boolean().optional(),
  closed_at: z.iso.datetime({ offset: true }).nullish(),
  merged_at: z.iso.datetime({ offset: true }).nullish(),
});

const columns = {
  number: 'INTEGER',
  title: 'VARCHAR',
  state: 'VARCHAR',
  author: 'VARCHAR',
  labels: 'VARCHAR[]',
  assignees: 'VARCHAR[]',
  comments: 'INTEGER',
  created_at: 'TIMESTAMP',
  updated_at: 'TIMESTAMP',
  html_url: 'VARCHAR',
};

const timestamp = (value: string | null | undefined) =>
  value ? new Date(value).toISOString().slice(0, 19).replace('T', ' ') : null;

export async function readGitHubTables(
  options: GitHubSourceOptions,
  call: ToolCall,
  abortSignal?: AbortSignal,
): Promise<DataSourceConfig[]> {
  const { repository, since, maxRecords, timeoutMs } = options;
  const [owner, repo] = repository.split('/');
  const cutoff = since ? `${since}T00:00:00.000Z` : undefined;
  const signal = AbortSignal.any([AbortSignal.timeout(timeoutMs), ...(abortSignal ? [abortSignal] : [])]);
  const issues = new Map<number, z.infer<typeof itemSchema>>();
  const pulls = new Map<number, z.infer<typeof itemSchema>>();

  const append = (target: typeof issues, item: z.infer<typeof itemSchema>) => {
    if (item.state === 'closed' && cutoff && new Date(item.updated_at).toISOString() < cutoff) return;
    target.set(item.number, item);
    if (issues.size + pulls.size > maxRecords) {
      throw new Error(`GitHub 记录超过 ${maxRecords} 条，请缩小已关闭记录的时间范围或提高记录上限。`);
    }
  };

  for (const kind of ['issues', 'pull_requests'] as const) {
    const target = kind === 'issues' ? issues : pulls;
    for (const state of ['open', 'closed']) {
      const seen = new Set<number>();
      const cursors = new Set<string>();
      let after: string | undefined;
      for (let page = 1; ; page++) {
        signal.throwIfAborted();
        const result = await call(
          kind === 'issues' ? 'list_issues' : 'list_pull_requests',
          {
            owner,
            repo,
            perPage: 100,
            ...(kind === 'issues'
              ? {
                  state: state.toUpperCase(),
                  orderBy: 'UPDATED_AT',
                  direction: 'DESC',
                  ...(after ? { after } : {}),
                  ...(state === 'closed' && cutoff ? { since: cutoff } : {}),
                }
              : { state, page, sort: 'updated', direction: 'desc' }),
          },
          signal,
        );
        const issuePage =
          kind === 'issues'
            ? z
                .object({
                  issues: z.array(itemSchema),
                  pageInfo: z.object({ hasNextPage: z.boolean(), endCursor: z.string().optional() }),
                })
                .parse(result)
            : undefined;
        const items = issuePage ? issuePage.issues : z.array(itemSchema).parse(result);
        let added = 0;
        for (const item of items) {
          if (!seen.has(item.number)) added++;
          seen.add(item.number);
          append(target, item);
        }
        if (
          (issuePage ? !issuePage.pageInfo.hasNextPage : items.length < 100) ||
          (state === 'closed' &&
            cutoff &&
            items.every((item) => new Date(item.updated_at).toISOString() < cutoff))
        )
          break;
        if (!added) throw new Error('GitHub 分页重复，读取已停止。');
        if (issuePage) {
          after = issuePage.pageInfo.endCursor;
          if (!after || cursors.has(after)) throw new Error('GitHub 分页游标无效，读取已停止。');
          cursors.add(after);
        }
      }
    }
  }

  const source = (name: string, records: typeof issues, pr: boolean): DataSourceConfig => ({
    type: 'json',
    name,
    options: {
      data: [...records.values()]
        .sort((a, b) => a.number - b.number)
        .map((item) => ({
          number: item.number,
          title: item.title,
          state: item.state,
          author: item.user?.login ?? null,
          labels: item.labels,
          assignees: item.assignees,
          comments: item.comments ?? (pr ? null : 0),
          created_at: timestamp(item.created_at),
          updated_at: timestamp(item.updated_at),
          html_url: `https://github.com/${repository}/${pr ? 'pull' : 'issues'}/${item.number}`,
          ...(pr
            ? {
                is_draft: item.draft ?? null,
                is_merged: Boolean(item.merged_at),
                closed_at: timestamp(item.closed_at),
                merged_at: timestamp(item.merged_at),
              }
            : {}),
        })),
      options: {
        format: 'array',
        columns: {
          ...columns,
          ...(pr
            ? { is_draft: 'BOOLEAN', is_merged: 'BOOLEAN', closed_at: 'TIMESTAMP', merged_at: 'TIMESTAMP' }
            : {}),
        },
      },
    },
  });
  return [source('issues', issues, false), source('pull_requests', pulls, true)];
}
