import { createRoot } from 'react-dom/client';
import { I18nextProvider, initReactI18next } from 'react-i18next';
import { createI18n } from '../shared/i18n';
import { useWorkspace } from './hooks/useWorkspace';
import App from './App';
import './styles.css';

const i18n = createI18n();
i18n.use(initReactI18next);

function Workspace() {
  const { state, error, refresh } = useWorkspace(i18n);
  if (!state) {
    return (
      <div className="grid h-screen place-content-center gap-4 text-center text-muted" role="status">
        {error ? (
          <>
            <p lang="zh-CN">无法加载工作台 / Unable to load workspace</p>
            <button onClick={() => void refresh()}>重试 / Retry</button>
          </>
        ) : (
          <span className="size-6 animate-spin rounded-full border-2 border-current border-t-transparent" />
        )}
      </div>
    );
  }
  return (
    <I18nextProvider i18n={i18n}>
      <App state={state} />
    </I18nextProvider>
  );
}

const root = createRoot(document.getElementById('root')!);
root.render(<Workspace />);

if (import.meta.hot) import.meta.hot.dispose(() => root.unmount());
