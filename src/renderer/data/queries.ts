import { keepPreviousData, QueryClient, queryOptions } from '@tanstack/react-query';
import type { Dataset, RunSummary, State } from '@shared/contracts';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false, refetchOnWindowFocus: false, refetchOnReconnect: false },
    mutations: { retry: false },
  },
});

export function previewQuery(dataset: Dataset, table: string, page: number, pageSize: number, active = true) {
  return queryOptions({
    queryKey: ['preview', dataset.id, dataset.updatedAt, table, page, pageSize],
    queryFn: () =>
      window.workbench.datasetPreview(dataset.id, table, {
        offset: (page - 1) * pageSize,
        limit: pageSize + 1,
      }),
    enabled: active && !!table && !dataset.deletedAt,
    gcTime: 60_000,
  });
}

export function tableDetailsQuery(dataset: Dataset, table: string | null) {
  return queryOptions({
    queryKey: ['tableDetails', dataset.id, dataset.updatedAt, table],
    queryFn: () => window.workbench.datasetGetTableDetails(dataset.id, table!),
    enabled: !!table && dataset.schema.models.some((model) => model.name === table),
  });
}

export function runQuery(summary: RunSummary) {
  return queryOptions({
    queryKey: ['run', summary.id, summary.snippet?.updatedAt],
    queryFn: () => window.workbench.analysisGetRun(summary.id),
    // Original messages are immutable; snippet changes invalidate via updated_at.
    staleTime: Infinity,
    placeholderData: keepPreviousData,
  });
}

export function pruneWorkspaceQueries(state: State) {
  const datasets = new Set(state.datasets.filter((d) => !d.deletedAt).map(({ id }) => id));
  const runs = new Set(state.runs.map(({ id }) => id));
  queryClient.removeQueries({
    predicate: ({ queryKey: [kind, id] }) =>
      (kind === 'run' && !runs.has(String(id))) ||
      ((kind === 'preview' || kind === 'tableDetails') && !datasets.has(String(id))),
  });
}
