import { useEffect, useState } from 'react';
import { Toaster } from 'sonner';
import { AppShell } from './components/AppShell';
import { WorkspaceSearch } from './components/WorkspaceSearch';
import { Button } from './components/Button';
import { useWorkspace } from './hooks/useWorkspace';
import { useWorkspaceNavigation } from './hooks/useWorkspaceNavigation';
import { draftKey } from './utils/workspaceNavigation';
import { AnalysisPage } from './pages/analysis';
import { DatasetsPage } from './pages/datasets';
import { SettingsPage } from './pages/settings';
import { SnippetsPage } from './pages/snippets';
import { WelcomePage } from './pages/WelcomePage';

export default function App() {
  const { state, error, refresh } = useWorkspace();
  const navigation = useWorkspaceNavigation(state);
  const {
    page,
    activeDatasetId: analysisDatasetId,
    activeConversationId,
    datasetTabs,
    openDataset,
    closeDataset,
    conversationsFor,
    navigate: setPage,
  } = navigation;
  const [searchOpen, setSearchOpen] = useState(false);
  const datasetCount = state?.datasets.length ?? 0;

  useEffect(() => {
    document.documentElement.dataset.theme = state?.theme.mode ?? 'light';
  }, [state?.theme.mode]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.isComposing || event.keyCode === 229 || event.altKey || event.shiftKey) return;
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setSearchOpen((open) => !open);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  return (
    <AppShell
      page={page}
      hasDatasets={datasetCount > 0}
      datasetTabs={datasetTabs}
      activeDatasetId={analysisDatasetId}
      conversations={analysisDatasetId ? conversationsFor(analysisDatasetId) : []}
      activeConversationId={activeConversationId}
      onDatasetSelect={openDataset}
      onDatasetClose={closeDataset}
      onSearch={() => setSearchOpen(true)}
      onConversationSelect={navigation.selectConversation}
      onConversationCreate={() => {
        if (analysisDatasetId) openDataset(analysisDatasetId, null);
      }}
      onNavigate={setPage}
    >
      {state && searchOpen && (
        <WorkspaceSearch
          datasets={state.datasets}
          conversations={state.conversations}
          onClose={() => setSearchOpen(false)}
          onDatasetSelect={openDataset}
          onConversationSelect={navigation.selectConversation}
        />
      )}
      {!state && !error && <div className="grid h-full place-items-center text-muted">正在加载工作台…</div>}
      {!state && error && (
        <div className="grid h-full place-content-center justify-items-center gap-4">
          <p className="m-0 text-danger">{error}</p>
          <Button onClick={() => void refresh()}>重新加载</Button>
        </div>
      )}
      {state && page === 'welcome' && <WelcomePage />}
      {state && page === 'datasets' && (
        <DatasetsPage
          datasets={state.datasets}
          onAdd={() => setPage('welcome')}
          onOpen={openDataset}
          onDelete={closeDataset}
        />
      )}
      {state && page === 'analysis' && analysisDatasetId && (
        <AnalysisPage
          datasetId={analysisDatasetId}
          datasetUpdatedAt={state.datasets.find((dataset) => dataset.id === analysisDatasetId)?.updatedAt}
          conversationId={activeConversationId}
          question={navigation.drafts[draftKey(analysisDatasetId, activeConversationId)] ?? ''}
          onQuestionChange={(question) =>
            navigation.setDraft(analysisDatasetId, activeConversationId, question)
          }
          onConversationChange={(id, submitted) =>
            navigation.completeStart(analysisDatasetId, activeConversationId, id, submitted)
          }
          onBack={() => setPage('datasets')}
          savedMessageIds={state.snippets.map((snippet) => snippet.messageId)}
          models={state.models}
          activeModelId={state.activeModelId}
          preferences={state.preferences}
        />
      )}
      {state && page === 'snippets' && <SnippetsPage snippets={state.snippets} />}
      {state && page === 'settings' && <SettingsPage state={state} />}
      <Toaster
        theme={state?.theme.mode ?? 'light'}
        position="bottom-right"
        visibleToasts={1}
        toastOptions={{
          style: {
            width: 'max-content',
            maxWidth: 'calc(100vw - 32px)',
            minHeight: 'unset',
            padding: '8px 12px',
            border: '1px solid var(--line)',
            borderRadius: '8px',
            background: 'var(--surface)',
            color: 'var(--ink)',
            boxShadow: '0 4px 16px #00000012',
            fontSize: '12px',
          },
        }}
      />
    </AppShell>
  );
}
