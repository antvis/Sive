import { createHashRouter, Navigate } from 'react-router';
import App from '../App';
import { AnalysisRoute } from './AnalysisRoute';
import { routePaths } from './paths';
import { DatasetsRoute, SettingsRoute, SnippetsRoute, WelcomeRoute } from './WorkspaceRoutes';

export const router = createHashRouter([
  {
    path: '/',
    Component: App,
    children: [
      { index: true, element: <Navigate to={routePaths.datasets} replace /> },
      { path: routePaths.datasets, Component: DatasetsRoute },
      { path: routePaths.datasetCreate, Component: WelcomeRoute },
      { path: routePaths.analysis, Component: AnalysisRoute },
      { path: routePaths.snippets, Component: SnippetsRoute },
      { path: routePaths.settings, Component: SettingsRoute },
      { path: '*', element: <Navigate to={routePaths.datasets} replace /> },
    ],
  },
]);
