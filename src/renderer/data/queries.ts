import { keepPreviousData, QueryClient, queryOptions, skipToken } from '@tanstack/react-query';
import type { Dataset, ModelProfile, RunSummary, State } from '@shared/contracts';

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
    queryFn: table ? () => window.workbench.datasetGetTableDetails(dataset.id, table) : skipToken,
    enabled: !!table && dataset.schema.models.some((model) => model.name === table),
  });
}

export function suggestionsQuery(dataset: Dataset, model?: ModelProfile, active = true) {
  return queryOptions({
    queryKey: ['suggestions', dataset.id, dataset.updatedAt, model?.id, model?.model, model?.updatedAt],
    queryFn: async ({ signal }) => {
      const requestId = crypto.randomUUID();

      const cancel = () => {
        void window.workbench.datasetCancelSuggestions(requestId);
      };
      signal.throwIfAborted();
      signal.addEventListener('abort', cancel, { once: true });
      try {
        return await window.workbench.datasetSuggest(dataset.id, requestId);
      } finally {
        signal.removeEventListener('abort', cancel);
      }
    },
    enabled: active && !!model && !dataset.deletedAt,
    staleTime: Infinity,
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
      ((kind === 'preview' || kind === 'tableDetails' || kind === 'suggestions') &&
        !datasets.has(String(id))),
  });
}
