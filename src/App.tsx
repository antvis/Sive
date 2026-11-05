import { useEffect, useRef, useState } from 'react';
import {
  Navigate,
  NavLink,
  Outlet,
  useLocation,
  useMatches,
  useNavigate,
  useParams,
  useSearchParams,
} from 'react-router';
import { Alert, useUI, Button, Spin } from './components/ui';
import { DatabaseIcon, GearSixIcon, FolderSimpleIcon } from '@phosphor-icons/react';
import type { Conversation, Dataset, State } from '../shared/contracts';
import type { AnalysisMode } from '../shared/analysis-options';
import { conversationIdsWithContent, type WorkspaceTab } from './shared/workspace-tabs';
import DatasetTabs from './components/DatasetTabs';
import ConversationHistory from './components/ConversationHistory';
import NewConversation from './components/NewConversation';
import ConversationSearch from './components/ConversationSearch';
import logo from '../assets/sive-logo.svg';
import { errorMessage } from './shared/feedback';
import { conversationView } from './shared/conversation-view';
import { useWorkspaceNavigation } from './shared/use-workspace-navigation';
import { observeWorkspace } from './shared/workspace-subscription';
import { datasetPath, datasetRedirect, paths } from './shared/routes';
import type { WorkspaceContext } from './shared/workspace-context';
import { pruneWorkspaceQueries } from './shared/queries';

const api = window.workbench;
export default function App() {
  const { message, confirm } = useUI();
  const [state, setState] = useState<State | null>(null);
  const [loadError, setLoadError] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [analysisMode, setAnalysisMode] = useState<AnalysisMode>('direct');
  const [exportingChat, setExportingChat] = useState(false);
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
  const { workspaceTabs, conversationState } = navigation;
  const matches = useMatches();
  const title = (matches.at(-1)?.handle as { title?: string } | undefined)?.title || 'Sive';
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
    return <div className="loading">{loadError ? <Alert type="error" title={loadError} /> : <Spin />}</div>;
  if (redirect) return <Navigate to={redirect} replace />;
  const busy = state.task?.status === 'running' || state.task?.status === 'cancelling';
  const dataset = state.datasets.find((d) => d.id === datasetId);
  const pageTitle = dataset?.name || title;
  const contentIds = conversationIdsWithContent(state);
  const conversations = state.conversations
    .filter((item) => item.datasetId === datasetId && contentIds.has(item.id))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  const selectConversation = (conversation: Conversation) =>
    navigate(datasetPath(conversation.datasetId, conversation.id));
  const newConversation = (keepDraft = false) => {
    if (!dataset || submitting) return;
    navigation.newConversation(dataset.id, keepDraft ? conversationState.question : undefined);
    navigate(datasetPath(dataset.id));
  };
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
  const exportChat = async (id: string, format: 'html' | 'md') => {
    if (exportingChat) return;
    setExportingChat(true);
    try {
      const view = conversationView(state.runs, state.tasks, state.task, id);
      const saved = await api.exportConversation(
        view.session.map((run) => run.id),
        view.currentTask?.id || null,
        format,
      );
      if (saved) message.success('会话已导出');
    } catch (error) {
      message.error(errorMessage(error));
    } finally {
      setExportingChat(false);
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
    newConversation,
    openModelSettings,
  };
  return (
    <div className={'shell' + (sidebarOpen ? '' : ' sidebar-collapsed')}>
      <aside className="sidebar" id="workspace-sidebar" inert={!sidebarOpen} aria-hidden={!sidebarOpen}>
        <div className="brand">
          <img src={logo} alt="Sive 标志" />
          <strong>Sive</strong>
          <ConversationSearch
            conversations={state.conversations.filter((item) => contentIds.has(item.id))}
            datasets={state.datasets}
            disabled={submitting}
            onSelect={selectConversation}
          />
        </div>
        <nav>
          <NewConversation
            datasets={state.datasets}
            current={dataset}
            disabled={submitting}
            onNew={(source) => {
              navigation.newConversation(source.id);
              navigate(datasetPath(source.id));
            }}
            onAddData={() => navigate(paths.newData)}
          />
          <NavLink to={paths.data}>
            <DatabaseIcon />
            数据源
          </NavLink>
          <NavLink to={paths.saved}>
            <FolderSimpleIcon />
            分析收藏
          </NavLink>
        </nav>
        {dataset && (
          <ConversationHistory
            key={dataset.id}
            sourceName={dataset.name}
            conversations={conversations}
            currentId={conversationId}
            disabled={submitting}
            onSelect={selectConversation}
            onNew={() => newConversation()}
            exporting={exportingChat}
            deleteDisabled={(conversation) =>
              submitting ||
              (busy && state.task?.conversationId === conversation.id) ||
              state.runs.some(
                (run) => run.id === state.refreshingSavedId && run.conversationId === conversation.id,
              )
            }
            onExport={(conversation, format) => exportChat(conversation.id, format)}
            onDelete={(conversation) =>
              confirm({
                title: '移除这个会话？',
                content: `“${conversation.title}”将移至设置中的“已删除会话”，分析记录和收藏会保留，可随时恢复。`,
                okText: '删除会话',
                cancelText: '取消',
                onOk: () => api.deleteConversation(conversation.id),
              })
            }
          />
        )}
        <NavLink to="/settings" className={({ isActive }) => 'settings-link' + (isActive ? ' active' : '')}>
          <GearSixIcon />
          设置
        </NavLink>
      </aside>
      <main className="workspace">
        <DatasetTabs
          sidebarOpen={sidebarOpen}
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
          datasets={state.datasets}
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
        <header className="topbar">
          <strong title={pageTitle}>{pageTitle}</strong>
          <span className="min-w-[4px] flex-1" />
          {busy && (
            <Button
              variant="ghost"
              size="small"
              onClick={() => navigate(datasetPath(state.task!.datasetId, state.task!.conversationId))}
            >
              <Spin size="small" />
              分析进行中
            </Button>
          )}
        </header>
        {loadError && <Alert type="error" title={loadError} />}
        <div
          className="page"
          id="workspace-panel"
          role={dataset ? 'tabpanel' : undefined}
          aria-label={dataset?.name}
        >
          <Outlet context={context} />
        </div>
      </main>
    </div>
  );
}
