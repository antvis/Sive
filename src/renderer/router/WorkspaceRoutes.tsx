import { useEffect, useRef } from 'react';
import { Navigate, useNavigate } from 'react-router';
import { DatasetsPage } from '../pages/datasets';
import { SettingsPage } from '../pages/settings';
import { SnippetsPage } from '../pages/snippets';
import { WelcomePage } from '../pages/WelcomePage';
import { useWorkspaceRouteContext } from './context';
import { routePaths } from './paths';

export function DatasetsRoute() {
  const { state, openDataset, closeDataset } = useWorkspaceRouteContext();
  const navigate = useNavigate();

  if (!state.datasets.length) return <Navigate to={routePaths.datasetCreate} replace />;

  return (
    <DatasetsPage
      datasets={state.datasets}
      onAdd={() => void navigate(routePaths.datasetCreate)}
      onOpen={openDataset}
      onDelete={closeDataset}
    />
  );
}

export function WelcomeRoute() {
  const { state } = useWorkspaceRouteContext();
  const navigate = useNavigate();
  const datasetCount = state.datasets.length;
  const previousDatasetCount = useRef(datasetCount);

  useEffect(() => {
    if (datasetCount > previousDatasetCount.current) void navigate(routePaths.datasets, { replace: true });
    previousDatasetCount.current = datasetCount;
  }, [datasetCount, navigate]);

  return <WelcomePage />;
}

export function SettingsRoute() {
  const { state } = useWorkspaceRouteContext();

  return <SettingsPage state={state} />;
}

export function SnippetsRoute() {
  const { state } = useWorkspaceRouteContext();

  return <SnippetsPage snippets={state.snippets} />;
}
