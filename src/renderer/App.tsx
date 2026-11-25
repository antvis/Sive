import { DEFAULT_PREFERENCES } from '@shared/api';
import { generateId } from 'ai';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { Toaster } from 'sonner';
import { AppShell } from './components/AppShell';
import { Button } from './components/ui/button';
import { UpdateNotification } from './components/UpdateNotification';
import type { AppPage } from './components/WorkspaceSidebar';
import { useWorkspace } from './hooks/useWorkspace';
import { I18nProvider } from './i18n';
import { AnalysisPage } from './pages/analysis';
import { DatasetsPage } from './pages/datasets';
import { SettingsWindow } from './pages/settings';
import { SnippetsPage } from './pages/snippets';
import { WelcomePage } from './pages/WelcomePage';
import { ThemeContext } from './theme';
import type { Conversation, DatasetSummary, WorkspaceState } from './types';

const EMPTY_DATASETS: DatasetSummary[] = [];
const RECENT_CONVERSATION_LIMIT = 5;

type AnalysisSelection = {
  datasetId: string;
  chatId: string;
  draftId: string;
  saved: boolean;
};

const analysisSelection = (datasetId: string, conversationId?: string): AnalysisSelection => {
  const chatId = conversationId ?? generateId();
  const saved = conversationId !== undefined;
  return { datasetId, chatId, draftId: chatId, saved };
};

export default function App() {
  const settingsWindow = window.location.hash === '#settings';
  const { state, error, refresh } = useWorkspace();
  const [systemDark, setSystemDark] = useState(
    () => window.matchMedia('(prefers-color-scheme: dark)').matches,
  );

  const { mode: preferredMode, fontSize } = state?.preferences.theme ?? DEFAULT_PREFERENCES.theme;
  const isDark = preferredMode === 'system' ? systemDark : preferredMode === 'dark';
  const theme = useMemo(() => ({ mode: isDark ? 'dark' : 'light', fontSize }) as const, [isDark, fontSize]);

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');

    const update = () => setSystemDark(media.matches);
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);

  useLayoutEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = theme.mode;
    root.style.fontSize = `${theme.fontSize}px`;
  }, [theme]);

  const fallback =
    !state &&
    (error ? (
      <div className="grid h-full place-content-center justify-items-center gap-4">
        <p className="m-0 text-danger">{error}</p>
        <Button onClick={() => void refresh()}>重新加载</Button>
      </div>
    ) : (
      <div className="grid h-full place-items-center text-muted-foreground">正在加载工作台…</div>
    ));

  return (
    <I18nProvider language={state?.preferences.language}>
      <ThemeContext value={theme}>
        {settingsWindow ? (
          <SettingsWindow state={state} fallback={fallback} />
        ) : (
          <Workspace state={state} fallback={fallback} />
        )}
        <Toaster
          theme={theme.mode}
          position="bottom-right"
          visibleToasts={1}
          toastOptions={{
            className: 'rounded-xl! text-sm! shadow-overlay!',
            style: {
              width: 'max-content',
              maxWidth: 'calc(100vw - 32px)',
              minHeight: 'unset',
              padding: '8px 12px',
              border: '1px solid var(--line)',
              background: 'var(--surface)',
              color: 'var(--ink)',
            },
          }}
        />
        <UpdateNotification />
      </ThemeContext>
    </I18nProvider>
  );
}

function Workspace({ state, fallback }: { state: WorkspaceState | null; fallback: ReactNode }) {
  const [page, setPage] = useState<AppPage>('welcome');
  const [analysis, setAnalysis] = useState<AnalysisSelection | null>(null);
  const [collapsedPreviews, setCollapsedPreviews] = useState<Record<string, boolean>>({});
  const analysisDatasetId = analysis?.datasetId ?? null;
  const activeConversationId = analysis?.saved ? analysis.chatId : null;
  const datasets = state?.datasets ?? EMPTY_DATASETS;
  const analysisDataset = datasets.find((dataset) => dataset.id === analysisDatasetId);
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

  const openAnalysis = (datasetId: string, conversationId?: string) => {
    setAnalysis(analysisSelection(datasetId, conversationId));
    setPage('analysis');
  };

  const changeDraftDataset = (datasetId: string) => {
    // A chat ID can already be tied to a data source if saving the first message fails.
    const chatId = generateId();
    setAnalysis((current) =>
      current && !current.saved && current.datasetId !== datasetId
        ? { ...current, datasetId, chatId }
        : current,
    );
  };

  const confirmConversation = useCallback((chatId: string) => {
    setAnalysis((current) =>
      current?.chatId === chatId && !current.saved ? { ...current, saved: true } : current,
    );
  }, []);

  useEffect(() => {
    const previous = previousDatasetCount.current;
    if (datasetCount > 0 && (previous === undefined || datasetCount > previous)) setPage('datasets');
    previousDatasetCount.current = datasetCount;
  }, [datasetCount]);

  useEffect(() => {
    if (!state || !analysisDatasetId || analysisDataset) return;
    setAnalysis(null);
    if (page === 'analysis') setPage('datasets');
  }, [state, analysisDatasetId, analysisDataset, page]);

  return (
    <AppShell
      page={page}
      datasets={datasets}
      activeDatasetId={analysisDataset?.id ?? null}
      conversationsByDataset={conversationsByDataset}
      recentConversations={recentConversations}
      activeConversationId={activeConversationId}
      renderAnalysis={
        state && page === 'analysis' && analysis && analysisDataset
          ? (frame) => (
              <AnalysisPage
                {...frame}
                dataset={analysisDataset}
                datasets={datasets}
                onDatasetChange={changeDraftDataset}
                chatId={analysis.chatId}
                draftId={analysis.draftId}
                conversationId={activeConversationId}
                datasetCollapsed={collapsedPreviews[analysis.draftId] ?? false}
                onDatasetCollapsedChange={(collapsed) =>
                  setCollapsedPreviews((current) => ({ ...current, [analysis.draftId]: collapsed }))
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
      {fallback}
      {state && page === 'welcome' && <WelcomePage />}
      {state && page === 'datasets' && (
        <DatasetsPage datasets={state.datasets} onAdd={() => setPage('welcome')} onOpen={openAnalysis} />
      )}
      {state && page === 'snippets' && <SnippetsPage snippets={state.snippets} />}
    </AppShell>
  );
}
