import { createHashRouter, Navigate, useLocation, useNavigate, useParams } from 'react-router';
import App from './App';
import WelcomePage from './components/WelcomePage';
import DataManager from './components/DataManager';
import NewDataSourcePage from './components/NewDataSourcePage';
import AnalysisPage from './components/AnalysisPage';
import SavedAnalyses from './components/SavedAnalyses';
import Settings from './components/Settings';
import { useUI } from './components/ui';
import { useWorkspace } from './shared/workspace-context';
import { datasetPath, paths, settingsReturnTo } from './shared/routes';

function HomeRoute() {
  const { state } = useWorkspace();
  return <Navigate to={state.datasets.some((d) => !d.deletedAt) ? paths.data : paths.welcome} replace />;
}
function WelcomeRoute() {
  const { open, busy, state } = useWorkspace();
  return <WelcomePage open={open} busy={busy || !!state.refreshingSavedId} />;
}
function DataRoute() {
  const { open, busy, state } = useWorkspace();
  return (
    <DataManager
      datasets={state.datasets.filter((d) => !d.deletedAt)}
      open={open}
      busy={busy || !!state.refreshingSavedId}
    />
  );
}
function SettingsRoute() {
  const { state } = useWorkspace();
  const { tab = 'general' } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  if (!['general', 'models', 'deleted'].includes(tab)) return <Navigate to={paths.settings} replace />;
  const returnTo = settingsReturnTo(location.state?.returnTo);
  return (
    <Settings
      state={state}
      tab={tab}
      onTab={(next) => navigate(`/settings/${next}`, { state: location.state })}
      onBack={returnTo ? () => navigate(returnTo) : undefined}
    />
  );
}
function SavedRoute() {
  const { state, busy } = useWorkspace();
  const navigate = useNavigate();
  const { message } = useUI();
  return (
    <SavedAnalyses
      runs={state.runs}
      datasets={state.datasets}
      onOpen={(run) => {
        const conversation = state.conversations.find((c) => c.id === run.conversationId);
        if (!conversation) {
          message.warning('所属会话不存在，请从数据页面新建分析。');
          return;
        }
        navigate(datasetPath(conversation.datasetId, conversation.id, run.id));
      }}
      refreshingId={state.refreshingSavedId}
      busy={busy}
      onRemove={(id) => window.workbench.removeSavedAnalysis(id)}
    />
  );
}

// Hash routes also work when packaged Electron loads index.html through file://.
export const router = createHashRouter([
  {
    element: <App />,
    children: [
      { index: true, element: <HomeRoute /> },
      { path: 'welcome', element: <WelcomeRoute /> },
      { path: 'data', element: <DataRoute /> },
      { path: 'data/new', element: <NewDataSourcePage /> },
      { path: 'datasets/:datasetId', element: <AnalysisPage /> },
      { path: 'saved', element: <SavedRoute /> },
      { path: 'settings', element: <Navigate to={paths.settings} replace /> },
      { path: 'settings/:tab', element: <SettingsRoute /> },
      { path: '*', element: <HomeRoute /> },
    ],
  },
]);
