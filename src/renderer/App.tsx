import { DEFAULT_PREFERENCES } from '@shared/api';
import { generateId } from 'ai';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Toaster } from 'sonner';
import { AppShell } from './components/AppShell';
import { Button } from './components/Button';
import type { AppPage } from './components/WorkspaceSidebar';
import { useWorkspace } from './hooks/useWorkspace';
import { I18nProvider } from './i18n';
import { AnalysisPage } from './pages/analysis';
import { DatasetsPage } from './pages/datasets';
import { SettingsPage } from './pages/settings';
import { SnippetsPage } from './pages/snippets';
import { WelcomePage } from './pages/WelcomePage';
import { ThemeContext } from './theme';
import type { Conversation, DatasetSummary } from './types';

const EMPTY_DATASETS: DatasetSummary[] = [];
const RECENT_CONVERSATION_LIMIT = 5;

type AnalysisSelection = { datasetId: string; chatId: string; saved: boolean };

const analysisSelection = (datasetId: string, conversationId?: string): AnalysisSelection => ({
  datasetId,
  chatId: conversationId ?? generateId(),
  saved: conversationId !== undefined,
});

export default function App() {
  const [page, setPage] = useState<AppPage>('welcome');
  const [systemDark, setSystemDark] = useState(
    () => window.matchMedia('(prefers-color-scheme: dark)').matches,
  );
  const [analysis, setAnalysis] = useState<AnalysisSelection | null>(null);
  const [collapsedPreviews, setCollapsedPreviews] = useState<Record<string, boolean>>({});
  const [openDatasetIds, setOpenDatasetIds] = useState<string[]>([]);
  const { state, error, refresh } = useWorkspace();
  const analysisDatasetId = analysis?.datasetId ?? null;
  const activeConversationId = analysis?.saved ? analysis.chatId : null;
  const datasets = state?.datasets ?? EMPTY_DATASETS;
  const conversations = state?.conversations;
  const datasetCount = datasets.length;
  const previousDatasetCount = useRef<number | undefined>(undefined);
  const { conversationsByDataset, recentConversations } = useMemo(() => {
    const conversationsByDataset = new Map<string, Conversation[]>(
      datasets.map((dataset) => [dataset.id, []]),
    );
    const recentConversations: Conversation[] = [];
    const ordered = conversations?.toSorted((a, b) => b.updatedAt.localeCompare(a.updatedAt)) ?? [];
    for (const conversation of ordered) {
      const group = conversationsByDataset.get(conversation.datasetId);
      if (!group) continue;
      group.push(conversation);
      if (recentConversations.length < RECENT_CONVERSATION_LIMIT) recentConversations.push(conversation);
    }
    return { conversationsByDataset, recentConversations };
  }, [datasets, conversations]);

  const datasetTabs = openDatasetIds.flatMap((id) => {
    const dataset = datasets.find((item) => item.id === id);
    return dataset ? [dataset] : [];
  });

  const latestConversationId = (datasetId: string) => conversationsByDataset.get(datasetId)?.[0]?.id;

  const openAnalysis = (datasetId: string, conversationId?: string) => {
    setOpenDatasetIds((current) => (current.includes(datasetId) ? current : [...current, datasetId]));
    setAnalysis(analysisSelection(datasetId, conversationId));
    setPage('analysis');
  };

  const openDataset = (id: string) => {
    const latest = latestConversationId(id);
    if (id === analysisDatasetId && !latest && !activeConversationId) {
      setPage('analysis');
      return;
    }
    openAnalysis(id, latest);
  };

  const confirmConversation = useCallback((chatId: string) => {
    setAnalysis((current) =>
      current?.chatId === chatId && !current.saved ? { ...current, saved: true } : current,
    );
  }, []);

  const closeDataset = (id: string) => {
    const remaining = datasetTabs.filter((dataset) => dataset.id !== id).map((dataset) => dataset.id);
    setOpenDatasetIds(remaining);
    if (!remaining.length) {
      setAnalysis(null);
      setPage('datasets');
      return;
    }
    if (analysisDatasetId === id) {
      const next = remaining[remaining.length - 1];
      setAnalysis(analysisSelection(next, latestConversationId(next)));
    }
  };

  const preferredMode = state?.preferences.theme.mode ?? DEFAULT_PREFERENCES.theme.mode;
  const fontSize = state?.preferences.theme.fontSize ?? DEFAULT_PREFERENCES.theme.fontSize;
  const isDark = preferredMode === 'system' ? systemDark : preferredMode === 'dark';
  const theme = useMemo(
    () => ({ mode: isDark ? 'dark' : 'light', fontSize }) as const,
    [isDark, fontSize],
  );

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');

    const update = () => setSystemDark(media.matches);
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);

  useLayoutEffect(() => {
    document.documentElement.dataset.theme = theme.mode;
  }, [theme.mode]);

  useLayoutEffect(() => {
    document.documentElement.style.fontSize = `${fontSize}px`;
  }, [fontSize]);

  useEffect(() => {
    const previous = previousDatasetCount.current;
    if (datasetCount > 0 && (previous === undefined || datasetCount > previous)) setPage('datasets');
    previousDatasetCount.current = datasetCount;
  }, [datasetCount]);

  useEffect(() => {
    if (!state || !analysisDatasetId || state.datasets.some((dataset) => dataset.id === analysisDatasetId))
      return;
    setOpenDatasetIds((current) => current.filter((id) => id !== analysisDatasetId));
    setAnalysis(null);
    if (page === 'analysis') setPage('datasets');
  }, [state, analysisDatasetId, page]);

  const content = (
    <AppShell
      page={page}
      datasets={datasets}
      datasetTabs={datasetTabs}
      activeDatasetId={analysisDatasetId}
      conversationsByDataset={conversationsByDataset}
      recentConversations={recentConversations}
      activeConversationId={activeConversationId}
      renderAnalysis={
        state && page === 'analysis' && analysis
          ? (frame) => (
              <AnalysisPage
                {...frame}
                datasetId={analysis.datasetId}
                chatId={analysis.chatId}
                conversationId={activeConversationId}
                datasetCollapsed={collapsedPreviews[analysis.chatId] ?? false}
                onDatasetCollapsedChange={(collapsed) =>
                  setCollapsedPreviews((current) => ({ ...current, [analysis.chatId]: collapsed }))
                }
                onConversationChange={confirmConversation}
                savedMessageIds={state.snippets.map((snippet) => snippet.messageId)}
                models={state.models}
                activeModelId={state.activeModelId}
                preferences={state.preferences}
              />
            )
          : undefined
      }
      onDatasetSelect={openDataset}
      onDatasetClose={closeDataset}
      onConversationSelect={(conversation) => openAnalysis(conversation.datasetId, conversation.id)}
      onConversationCreate={openAnalysis}
      onConversationArchive={(conversation) => {
        const next = conversationsByDataset
          .get(conversation.datasetId)
          ?.find((item) => item.id !== conversation.id);
        const selection = analysisSelection(conversation.datasetId, next?.id);
        setAnalysis((current) => (current?.chatId === conversation.id ? selection : current));
      }}
      onNavigate={setPage}
    >
      {!state && !error && (
        <div className="grid h-full place-items-center text-muted-foreground">正在加载工作台…</div>
      )}
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
      {state && page === 'snippets' && <SnippetsPage snippets={state.snippets} />}
      {state && page === 'settings' && <SettingsPage state={state} />}
      <Toaster
        theme={theme.mode}
        position="bottom-right"
        visibleToasts={1}
        toastOptions={{
          className: 'text-sm!',
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
          },
        }}
      />
    </AppShell>
  );

  return (
    <I18nProvider language={state?.preferences.language}>
      <ThemeContext value={theme}>{content}</ThemeContext>
    </I18nProvider>
  );
}
