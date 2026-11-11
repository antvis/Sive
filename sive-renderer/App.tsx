import { useEffect, useState } from 'react';
import { Toaster } from 'sonner';
import { AppShell } from './components/AppShell';
import type { AppPage } from './components/AppShell';
import { Button } from './components/Button';
import { useWorkspace } from './hooks/useWorkspace';
import { SettingsPage } from './pages/settings';
import { WelcomePage } from './pages/WelcomePage';

export default function App() {
  const [page, setPage] = useState<AppPage>('welcome');
  const { state, error, refresh } = useWorkspace();

  useEffect(() => {
    document.documentElement.dataset.theme = state?.theme.mode ?? 'light';
  }, [state?.theme.mode]);

  return (
    <AppShell page={page} onNavigate={setPage}>
      {!state && !error && <div className="grid h-full place-items-center text-muted">正在加载工作台…</div>}
      {!state && error && (
        <div className="grid h-full place-content-center justify-items-center gap-4">
          <p className="m-0 text-danger">{error}</p>
          <Button onClick={() => void refresh()}>重新加载</Button>
        </div>
      )}
      {state && page === 'welcome' && <WelcomePage />}
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
