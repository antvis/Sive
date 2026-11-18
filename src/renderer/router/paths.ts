import { generatePath } from 'react-router';

export const routePaths = {
  datasets: '/datasets',
  datasetCreate: '/datasets/new',
  analysis: '/analysis/:datasetId/:conversationId',
  snippets: '/snippets',
  settings: '/settings',
} as const;

export const analysisPath = (datasetId: string, conversationId: string | null = null) =>
  generatePath(routePaths.analysis, {
    datasetId: encodeURIComponent(datasetId),
    conversationId: conversationId ? encodeURIComponent(conversationId) : 'new',
  });
