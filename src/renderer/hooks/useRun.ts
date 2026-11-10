import { useQuery } from '@tanstack/react-query';
import type { RunSummary } from '@shared/contracts';
import { errorMessage } from '@renderer/utils/feedback';
import { runQuery } from '@renderer/data/queries';

// Visibility and metadata always follow the latest workspace snapshot.
export function useRun(summary: RunSummary) {
  const query = useQuery(runQuery(summary));
  return {
    run: query.data
      ? {
          ...query.data,
          snippet: summary.snippet ? { ...query.data.snippet, ...summary.snippet } : undefined,
        }
      : undefined,
    error: query.error && !query.isFetching ? errorMessage(query.error) : undefined,
    retry: () => query.refetch(),
  };
}
