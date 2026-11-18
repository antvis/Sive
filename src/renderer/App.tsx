import { Outlet } from 'react-router';
import { Toaster } from 'sonner';
import { AppShell } from './components/AppShell';
import { Button } from './components/Button';
import { useAppearance } from './hooks/useAppearance';
import { useWorkspace } from './hooks/useWorkspace';
import { useWorkspaceTabs } from './hooks/useWorkspaceTabs';
import type { WorkspaceRouteContext } from './router/context';

export default function App() {
  const { state, error, refresh } = useWorkspace();
  const { datasetTabs, activeDatasetId, conversations, openDataset, closeDataset, createConversation } =
    useWorkspaceTabs(state);
  const theme = useAppearance(state?.preferences.theme);

  return (
    <AppShell
      datasetTabs={datasetTabs}
      activeDatasetId={activeDatasetId}
      conversations={conversations}
      onDatasetSelect={openDataset}
      onDatasetClose={closeDataset}
      onConversationCreate={createConversation}
    >
      {!state && !error && <div className="grid h-full place-items-center text-muted">正在加载工作台…</div>}
      {!state && error && (
        <div className="grid h-full place-content-center justify-items-center gap-4">
          <p className="m-0 text-danger">{error}</p>
          <Button onClick={() => void refresh()}>重新加载</Button>
        </div>
      )}
      {state && (
        <Outlet context={{ state, refresh, openDataset, closeDataset } satisfies WorkspaceRouteContext} />
      )}
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
