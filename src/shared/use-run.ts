import { useQuery } from '@tanstack/react-query';
import type { RunSummary } from '../../shared/contracts';
import { errorMessage } from './feedback';
import { runQuery } from './queries';

// Saving changes metadata only. Keep mounted charts and drafts intact until content changes.
export function useRun(summary: RunSummary) {
  const query = useQuery(runQuery(summary));
  return {
    run: query.data ? { ...query.data, savedAt: summary.savedAt, savedTitle: summary.savedTitle } : undefined,
    error: query.error && !query.isFetching ? errorMessage(query.error) : undefined,
    retry: () => query.refetch(),
  };
}
