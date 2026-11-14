import { useEffect, useState } from 'react';
import type { SuggestResult } from '../../types';
import { Button } from '../../components/Button';
import { errorMessage } from '../../utils';

export function DatasetQuestions({
  datasetId,
  onSelect,
}: {
  datasetId: string;
  onSelect: (question: string) => void;
}) {
  const [suggestions, setSuggestions] = useState<SuggestResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let live = true;
    setLoading(true);
    setError('');
    setSuggestions([]);
    window.workbench
      .datasetSuggest(datasetId)
      .then((result) => {
        if (live) setSuggestions(result);
      })
      .catch((cause) => {
        if (live) setError(errorMessage(cause));
      })
      .finally(() => {
        if (live) setLoading(false);
      });
    return () => {
      live = false;
    };
  }, [datasetId, attempt]);

  return (
    <div className="grid gap-2" aria-busy={loading}>
      {loading && (
        <p role="status" className="m-0 text-sm text-muted">
          正在生成推荐问题…
        </p>
      )}
      {error && (
        <p role="alert" className="m-0 text-sm text-danger">
          {error}
        </p>
      )}
      {!loading && !error && !suggestions.length && (
        <p className="m-0 text-sm text-muted">暂无推荐问题，可以重新生成或直接输入问题。</p>
      )}
      {!loading &&
        suggestions.map((suggestion) => (
          <button
            key={suggestion.query}
            type="button"
            className="rounded-xl bg-page px-4 py-3 text-left text-sm leading-6 text-muted transition-colors hover:bg-accent-soft"
            onClick={() => onSelect(suggestion.query)}
          >
            {suggestion.query}
          </button>
        ))}
      <Button
        className="justify-self-start"
        variant="ghost"
        disabled={loading}
        onClick={() => setAttempt((value) => value + 1)}
      >
        {error ? '重试推荐' : '重新推荐'}
      </Button>
    </div>
  );
}
