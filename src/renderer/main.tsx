import { SETTINGS_WINDOW_HASH } from '@shared/api';
import { createRoot } from 'react-dom/client';
import App from './App';
import { AppErrorBoundary } from './components/AppErrorBoundary';
import { initializeSentry } from './utils/sentry';
import './styles.css';

initializeSentry();

const settingsWindow = window.location.hash === `#${SETTINGS_WINDOW_HASH}`;
if (settingsWindow) document.title = '设置';

createRoot(document.getElementById('root')!).render(
  <AppErrorBoundary>
    <App settingsWindow={settingsWindow} />
  </AppErrorBoundary>,
);
