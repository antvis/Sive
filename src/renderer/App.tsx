import { useEffect, useRef, useState } from 'react';
import { I18nextProvider } from 'react-i18next';
import { Toaster } from 'sonner';
import { createRendererI18n } from './utils';
import { useWorkspace } from './hooks/useWorkspace';
import { AppShell } from './components/AppShell';
import type { AppPage } from './components/AppShell';
import type { WorkspaceState } from './types';
import { AnalysisPage } from './pages/analysis';
import { DatasetsPage } from './pages/datasets';
import { SettingsPage } from './pages/settings';
import { SnippetsPage } from './pages/snippets';
import { WelcomePage } from './pages/WelcomePage';

const i18n = createRendererI18n();

export default function App() {
  const { state } = useWorkspace(i18n);
  if (!state) return null;
  return (
    <I18nextProvider i18n={i18n}>
      <Workspace state={state} />
    </I18nextProvider>
  );
}

function Workspace({ state }: { state: WorkspaceState }) {
  const [page, setPage] = useState<AppPage>('welcome');
  const [systemDark, setSystemDark] = useState(
    () => window.matchMedia('(prefers-color-scheme: dark)').matches,
  );
  const [analysisDatasetId, setAnalysisDatasetId] = useState<string | null>(null);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [openDatasetIds, setOpenDatasetIds] = useState<string[]>([]);
  const datasetCount = state.datasets.length;
  const previousDatasetCount = useRef<number | undefined>(undefined);
  const datasetTabs = openDatasetIds.flatMap((id) => {
    const dataset = state.datasets.find((item) => item.id === id);
    return dataset ? [dataset] : [];
  });

  const conversationsFor = (datasetId: string) =>
    state.conversations
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

  const theme =
    state.preferences.theme.mode === 'system'
      ? systemDark
        ? 'dark'
        : 'light'
      : state.preferences.theme.mode;

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');

    const update = () => setSystemDark(media.matches);
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  useEffect(() => {
    document.documentElement.style.fontSize = `${state.preferences.theme.fontSize}px`;
  }, [state.preferences.theme.fontSize]);

  useEffect(() => {
    const previous = previousDatasetCount.current;
    if (datasetCount > 0 && (previous === undefined || datasetCount > previous)) setPage('datasets');
    previousDatasetCount.current = datasetCount;
  }, [datasetCount]);

  useEffect(() => {
    if (!analysisDatasetId || state.datasets.some((dataset) => dataset.id === analysisDatasetId)) return;
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
      {page === 'welcome' && <WelcomePage />}
      {page === 'datasets' && (
        <DatasetsPage
          datasets={state.datasets}
          onAdd={() => setPage('welcome')}
          onOpen={openDataset}
          onDelete={closeDataset}
        />
      )}
      {page === 'analysis' && analysisDatasetId && (
        <AnalysisPage
          datasetId={analysisDatasetId}
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
      {page === 'snippets' && <SnippetsPage snippets={state.snippets} />}
      {page === 'settings' && <SettingsPage state={state} />}
      <Toaster
        theme={theme}
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
