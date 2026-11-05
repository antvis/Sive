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
  return <Navigate to={state.datasets.length ? paths.data : paths.welcome} replace />;
}
function WelcomeRoute() {
  const { open, busy, state } = useWorkspace();
  return <WelcomePage open={open} busy={busy || !!state.refreshingSavedId} />;
}
function DataRoute() {
  const { open, busy, state } = useWorkspace();
  return <DataManager datasets={state.datasets} open={open} busy={busy || !!state.refreshingSavedId} />;
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
      { path: 'welcome', element: <WelcomeRoute />, handle: { title: '欢迎' } },
      { path: 'data', element: <DataRoute />, handle: { title: '数据源' } },
      { path: 'data/new', element: <NewDataSourcePage />, handle: { title: '新增数据源' } },
      { path: 'datasets/:datasetId', element: <AnalysisPage />, handle: { title: '数据源详情' } },
      { path: 'saved', element: <SavedRoute />, handle: { title: '洞察 Snippet' } },
      { path: 'settings', element: <Navigate to={paths.settings} replace /> },
      { path: 'settings/:tab', element: <SettingsRoute />, handle: { title: '设置' } },
      { path: '*', element: <HomeRoute /> },
    ],
  },
]);
