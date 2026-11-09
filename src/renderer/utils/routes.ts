import type { State } from '@shared/contracts';

export const paths = {
  welcome: '/welcome',
  data: '/data',
  newData: '/data/new',
  saved: '/saved',
  settings: '/settings/general',
};

export function datasetPath(datasetId: string, conversationId = '', runId = '') {
  const query = new URLSearchParams();
  if (conversationId) query.set('conversation', conversationId);
  if (runId) query.set('run', runId);
  return `/datasets/${encodeURIComponent(datasetId)}${query.size ? `?${query}` : ''}`;
}

export type DatasetLocation = { datasetId: string; conversationId: string; runId: string };

// Invalid/deleted references fall back to their nearest usable parent.
export function datasetRedirect(state: State, target: DatasetLocation) {
  if (!state.datasets.some((d) => d.id === target.datasetId)) return paths.data;
  if (
    target.conversationId &&
    !state.conversations.some((c) => c.id === target.conversationId && c.datasetId === target.datasetId)
  )
    return datasetPath(target.datasetId);
  if (
    target.runId &&
    !state.runs.some(
      (r) =>
        r.id === target.runId &&
        r.datasetId === target.datasetId &&
        r.conversationId === target.conversationId,
    )
  )
    return datasetPath(target.datasetId, target.conversationId);
  return undefined;
}

export function dataListReturnTo(value: unknown) {
  return typeof value === 'string' && /^\/data(?:\?[^#]*)?$/.test(value) ? value : paths.data;
}

export function settingsReturnTo(value: unknown) {
  return typeof value === 'string' && /^\/datasets\/[^/?#]+(?:\?[^#]*)?$/.test(value) ? value : undefined;
}
