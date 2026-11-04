import { useEffect, useState } from 'react';
import type { Run, RunSummary } from '../../shared/contracts';
import { errorMessage } from './feedback';

// Saving changes metadata only. Keep mounted charts and drafts intact until content changes.
export function useRun(summary: RunSummary) {
  const key = JSON.stringify([summary.id, summary.viewUpdatedAt]);
  const [loaded, setLoaded] = useState<{ key: string; run?: Run; error?: string }>();
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let live = true;
    void window.workbench.run(summary.id).then(
      (run) => {
        if (live) setLoaded({ key, run });
      },
      (error) => {
        if (live) setLoaded({ key, error: errorMessage(error) });
      },
    );
    return () => {
      live = false;
    };
  }, [key, attempt]);
  return {
    run:
      loaded?.key === key && loaded.run
        ? { ...loaded.run, savedAt: summary.savedAt, savedTitle: summary.savedTitle }
        : undefined,
    error: loaded?.key === key ? loaded.error : undefined,
    retry: () => {
      setLoaded(undefined);
      setAttempt((value) => value + 1);
    },
  };
}
