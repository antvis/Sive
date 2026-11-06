import { navigationItem } from './components/navigation-styles';
import { cx } from './shared/cx';
import { useEffect, useRef, useState } from 'react';
import {
  Navigate,
  NavLink,
  Outlet,
  useLocation,
  useNavigate,
  useParams,
  useSearchParams,
} from 'react-router';
import { Alert, useUI, Spin } from './components/ui';
import { DatabaseIcon, GearSixIcon, ChartBarIcon } from '@phosphor-icons/react';
import type { Conversation, Dataset, State } from '../shared/contracts';
import type { AnalysisMode } from '../shared/analysis-options';
import { conversationIdsWithContent, type WorkspaceTab } from './shared/workspace-tabs';
import DatasetTabs from './components/DatasetTabs';
import WorkspaceLayout from './components/WorkspaceLayout';
import ConversationHistory from './components/ConversationHistory';
import NewConversation from './components/NewConversation';
import ConversationSearch from './components/ConversationSearch';
import logo from '../assets/sive.svg';
import { errorMessage } from './shared/feedback';
import { useWorkspaceNavigation } from './shared/use-workspace-navigation';
import { observeWorkspace } from './shared/workspace-subscription';
import { datasetPath, datasetRedirect, paths } from './shared/routes';
import type { WorkspaceContext } from './shared/workspace-context';
import { pruneWorkspaceQueries } from './shared/queries';
import { usePreferences } from './preferences';

const api = window.workbench;
export default function App() {
  const { message } = useUI();
  const [state, setState] = useState<State | null>(null);
  const [loadError, setLoadError] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const { preferences, updatePreferences } = usePreferences();
  const analysisMode = preferences.analysisMode;
  const setAnalysisMode = (mode: AnalysisMode) => {
    updatePreferences({ analysisMode: mode });
  };
  const [archivingId, setArchivingId] = useState<string | null>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { datasetId = '' } = useParams();
  const [search] = useSearchParams();
  const conversationId = search.get('conversation') || '';
  const runId = search.get('run') || '';
  const target = { datasetId, conversationId, runId };
  const redirect = state && datasetId ? datasetRedirect(state, target) : undefined;
  const navigation = useWorkspaceNavigation(
    message.error,
    state && datasetId && !redirect ? target : undefined,
    location.key,
  );
  const { workspaceTabs } = navigation;
  const receive = (snapshot: State) => {
    pruneWorkspaceQueries(snapshot);
    setState(snapshot);
    navigation.receive(snapshot);
    setLoadError('');
  };
  const subscription = useRef<ReturnType<typeof observeWorkspace> | null>(null);
  useEffect(() => {
    const observer = observeWorkspace(api, receive, (error) => setLoadError(String(error)));
    subscription.current = observer;
    return () => {
      observer.dispose();
      subscription.current = null;
    };
  }, []);
  const refresh = async () => subscription.current?.refresh();
  if (!state)
    return (
      <div className="grid place-content-center min-h-50">
        {loadError ? <Alert type="error" title={loadError} /> : <Spin />}
      </div>
    );
  if (redirect) return <Navigate to={redirect} replace />;
  const busy = state.task?.status === 'running' || state.task?.status === 'cancelling';
  const dataset = state.datasets.find((d) => d.id === datasetId);
  const contentIds = conversationIdsWithContent(state);
  const conversations = state.conversations
    .filter((item) => item.datasetId === datasetId && contentIds.has(item.id))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  const selectConversation = (conversation: Conversation) =>
    navigate(datasetPath(conversation.datasetId, conversation.id));
  const openModelSettings = () =>
    navigate('/settings/models', { state: { returnTo: location.pathname + location.search } });
  const activateTab = (tab: WorkspaceTab) =>
    navigate(datasetPath(tab.datasetId, tab.conversationId, tab.runId));
  const open = (source: Dataset) => {
    // Import returns the dataset before the change subscription necessarily catches up.
    setState((previous) =>
      previous && !previous.datasets.some((d) => d.id === source.id)
        ? { ...previous, datasets: [...previous.datasets, source] }
        : previous,
    );
    const existing = navigation.getTab(source.id);
    const conversation = state.conversations.find((c) => c.datasetId === source.id && contentIds.has(c.id));
    navigate(datasetPath(source.id, existing?.conversationId ?? conversation?.id, existing?.runId));
    api.touchData(source.id).catch((error) => message.error(errorMessage(error)));
  };
  const archiveConversation = async (id: string) => {
    if (archivingId) return;
    setArchivingId(id);
    try {
      await api.deleteConversation(id);
      message.success('会话已归档，可在设置中恢复');
    } catch (error) {
      message.error(errorMessage(error));
    } finally {
      setArchivingId(null);
    }
  };
  const context: WorkspaceContext = {
    state,
    busy,
    submitting,
    setSubmitting,
    analysisMode,
    setAnalysisMode,
    navigation,
    open,
    refresh,
    openModelSettings,
  };
  return (
    <WorkspaceLayout
      sidebarOpen={sidebarOpen}
      onSidebarOpenChange={setSidebarOpen}
      sidebar={
        <aside
          className="sidebar mac:relative mac:pt-12 mac:before:content-[''] mac:before:absolute mac:before:top-0 mac:before:inset-x-0 mac:before:h-9 mac:before:[-webkit-app-region:drag] w-full h-full min-w-0 min-h-0 overflow-hidden flex flex-col py-5 px-3 bg-page"
          id="workspace-sidebar"
          inert={!sidebarOpen}
          aria-hidden={!sidebarOpen}
        >
          <div className="shrink-0 flex items-center gap-2 h-11 mb-4 pt-0 pr-2.5 pb-2 pl-2.5">
            <img className="w-6 h-6 object-contain dark:[filter:invert(1)]" src={logo} alt="Sive 标志" />
            <strong className="text-headline tracking-[-0.5px]">Sive</strong>
            <ConversationSearch
              conversations={state.conversations.filter((item) => contentIds.has(item.id))}
              datasets={state.datasets}
              disabled={submitting}
              onSelect={selectConversation}
            />
          </div>
          <nav className="grid gap-1 shrink-0">
            <NewConversation
              datasets={state.datasets.filter((d) => !d.deletedAt)}
              current={dataset?.deletedAt ? undefined : dataset}
              disabled={submitting}
              onNew={(source) => {
                navigation.newConversation(source.id);
                navigate(datasetPath(source.id));
              }}
              onAddData={() => navigate(paths.newData)}
            />
            <NavLink to={paths.data} className={navigationItem}>
              <DatabaseIcon />
              数据源
            </NavLink>
            <NavLink to={paths.saved} className={navigationItem}>
              <ChartBarIcon />
              洞察 Snippet
            </NavLink>
          </nav>
          {dataset && (
            <ConversationHistory
              key={dataset.id}
              conversations={conversations}
              currentId={conversationId}
              disabled={submitting}
              onSelect={selectConversation}
              archiveDisabled={(conversation) =>
                !!archivingId ||
                submitting ||
                (busy && state.task?.conversationId === conversation.id) ||
                state.runs.some(
                  (run) => run.id === state.refreshingSavedId && run.conversationId === conversation.id,
                )
              }
              onArchive={(conversation) => archiveConversation(conversation.id)}
            />
          )}
          <NavLink to="/settings" className={cx(navigationItem, 'mt-auto shrink-0')}>
            <GearSixIcon size={18} />
            设置
          </NavLink>
        </aside>
      }
    >
      <main className="h-full min-w-0 min-h-0 flex flex-col bg-surface">
        <DatasetTabs
          sidebarOpen={sidebarOpen}
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
          datasets={state.datasets.filter((d) => !d.deletedAt)}
          tabs={workspaceTabs.map((tab) => ({
            id: tab.id,
            name: state.datasets.find((d) => d.id === tab.datasetId)?.name || '数据源',
          }))}
          selectedId={datasetId}
          onSelect={(id) => {
            const tab = workspaceTabs.find((entry) => entry.id === id);
            if (tab) activateTab(tab);
          }}
          onOpenData={open}
          onAddData={() => navigate(paths.newData)}
          onClose={(id) => {
            const remaining = workspaceTabs.filter((tab) => tab.id !== id);
            navigation.close(id);
            if (id === datasetId)
              navigate(
                remaining.length
                  ? datasetPath(remaining[0].datasetId, remaining[0].conversationId, remaining[0].runId)
                  : paths.data,
                { replace: true },
              );
          }}
        />
        {loadError && <Alert type="error" title={loadError} />}
        <div
          className={cx(
            'page flex-1 min-h-0',
            dataset ? 'overflow-hidden p-0' : 'overflow-auto py-4 px-6 max-[1151px]:px-3',
          )}
          id="workspace-panel"
          role={dataset ? 'tabpanel' : undefined}
          aria-label={dataset?.name}
        >
          <Outlet context={context} />
        </div>
      </main>
    </WorkspaceLayout>
  );
}
