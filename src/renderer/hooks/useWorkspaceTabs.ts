import { useEffect, useState } from 'react';
import { useMatch, useNavigate } from 'react-router';
import { analysisPath, routePaths } from '../router/paths';
import type { WorkspaceState } from '../types';
import { getDatasetConversations } from '../utils';

export function useWorkspaceTabs(state: WorkspaceState | null) {
  const navigate = useNavigate();
  const analysisMatch = useMatch(routePaths.analysis);
  const routeDatasetId = analysisMatch?.params.datasetId;
  const [lastDatasetId, setLastDatasetId] = useState<string | null>(null);
  const [openDatasetIds, setOpenDatasetIds] = useState<string[]>([]);
  const datasets = state?.datasets;
  const routeDataset = datasets?.find((dataset) => dataset.id === routeDatasetId);
  const datasetTabs = openDatasetIds.flatMap((id) => {
    const dataset = datasets?.find((item) => item.id === id);
    return dataset ? [dataset] : [];
  });
  const activeDatasetId =
    routeDataset?.id ??
    datasetTabs.find((dataset) => dataset.id === lastDatasetId)?.id ??
    datasetTabs.at(-1)?.id ??
    null;
  const conversations = state?.conversations ?? [];

  const latestConversationId = (datasetId: string) =>
    getDatasetConversations(conversations, datasetId)[0]?.id ?? null;

  useEffect(() => {
    if (!datasets) return;
    const hasRouteDataset = datasets.some((dataset) => dataset.id === routeDatasetId);
    if (hasRouteDataset && routeDatasetId) setLastDatasetId(routeDatasetId);
    setOpenDatasetIds((current) => {
      const next = current.filter((id) => datasets.some((dataset) => dataset.id === id));
      if (hasRouteDataset && routeDatasetId && !next.includes(routeDatasetId)) next.push(routeDatasetId);
      return next.length === current.length && next.every((id, index) => id === current[index])
        ? current
        : next;
    });
  }, [datasets, routeDatasetId]);

  const openDataset = (id: string) => {
    void navigate(analysisPath(id, latestConversationId(id)));
  };

  const closeDataset = (id: string) => {
    const remaining = datasetTabs.filter((dataset) => dataset.id !== id).map((dataset) => dataset.id);
    setOpenDatasetIds(remaining);
    if (activeDatasetId === id) {
      const next = remaining[remaining.length - 1] ?? null;
      setLastDatasetId(next);
      if (analysisMatch) {
        void navigate(next ? analysisPath(next, latestConversationId(next)) : routePaths.datasets, {
          replace: true,
        });
      }
    }
  };

  const createConversation = () => {
    if (activeDatasetId) void navigate(analysisPath(activeDatasetId));
  };

  return {
    datasetTabs,
    activeDatasetId,
    conversations: activeDatasetId ? getDatasetConversations(conversations, activeDatasetId) : [],
    openDataset,
    closeDataset,
    createConversation,
  };
}
