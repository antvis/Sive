import { useEffect, useRef, useState } from 'react';
import { Toaster } from 'sonner';
import { AppShell } from './components/AppShell';
import type { AppPage } from './components/AppShell';
import { Button } from './components/Button';
import { useWorkspace } from './hooks/useWorkspace';
import { AnalysisPage } from './pages/analysis';
import { DatasetsPage } from './pages/datasets';
import { SettingsPage } from './pages/settings';
import { SnippetsPage } from './pages/snippets';
import { WelcomePage } from './pages/WelcomePage';

export default function App() {
  const [page, setPage] = useState<AppPage>('welcome');
  const [analysisDatasetId, setAnalysisDatasetId] = useState<string | null>(null);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [openDatasetIds, setOpenDatasetIds] = useState<string[]>([]);
  const { state, error, refresh } = useWorkspace();
  const datasetCount = state?.datasets.length ?? 0;
  const previousDatasetCount = useRef<number | undefined>(undefined);
  const datasetTabs = openDatasetIds.flatMap((id) => {
    const dataset = state?.datasets.find((item) => item.id === id);
    return dataset ? [dataset] : [];
  });
  const conversationsFor = (datasetId: string) =>
    (state?.conversations ?? [])
      .filter((conversation) => conversation.datasetId === datasetId)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  const latestConversationId = (datasetId: string) => conversationsFor(datasetId)[0]?.id ?? null;

  const openDataset = (id: string) => {
    setOpenDatasetIds((current) => (current.includes(id) ? current : [...current, id]));
    setAnalysisDatasetId(id);
    setActiveConversationId(latestConversationId(id));
    setPage('analysis');
  };

  const closeDataset = (id: string) => {
    const remaining = openDatasetIds.filter((item) => item !== id);
    setOpenDatasetIds(remaining);
    if (!remaining.length) {
      setAnalysisDatasetId(null);
      setActiveConversationId(null);
      setPage('datasets');
      return;
    }
    if (analysisDatasetId === id) {
      const next = remaining[remaining.length - 1] ?? null;
      setAnalysisDatasetId(next);
      setActiveConversationId(next ? latestConversationId(next) : null);
      if (page === 'analysis') setPage(next ? 'analysis' : 'datasets');
    }
  };

  useEffect(() => {
    document.documentElement.dataset.theme = state?.theme.mode ?? 'light';
  }, [state?.theme.mode]);

  useEffect(() => {
    const previous = previousDatasetCount.current;
    if (datasetCount > 0 && (previous === undefined || datasetCount > previous)) setPage('datasets');
    previousDatasetCount.current = datasetCount;
  }, [datasetCount]);

  useEffect(() => {
    if (!state || !analysisDatasetId || state.datasets.some((dataset) => dataset.id === analysisDatasetId))
      return;
    setOpenDatasetIds((current) => current.filter((id) => id !== analysisDatasetId));
    setAnalysisDatasetId(null);
    setActiveConversationId(null);
    if (page === 'analysis') setPage('datasets');
  }, [state, analysisDatasetId, page]);

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
      onConversationSelect={(id) => {
        setActiveConversationId(id);
        setPage('analysis');
      }}
      onConversationCreate={() => {
        setActiveConversationId(null);
        setPage('analysis');
      }}
      onConversationArchive={(id) => {
        if (id !== activeConversationId || !analysisDatasetId) return;
        const next = conversationsFor(analysisDatasetId).find((conversation) => conversation.id !== id);
        setActiveConversationId(next?.id ?? null);
      }}
      onNavigate={setPage}
    >
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
          onConversationChange={setActiveConversationId}
          onBack={() => {
            setAnalysisDatasetId(null);
            setActiveConversationId(null);
            setPage('datasets');
          }}
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
