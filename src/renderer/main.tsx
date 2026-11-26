import { createRoot } from 'react-dom/client';
import App from './App';
import { AppErrorBoundary } from './components/AppErrorBoundary';
import { SnippetExportPage } from './components/SnippetCard/ExportPage';
import { initializeSentry } from './utils/sentry';
import './styles.css';

initializeSentry();

createRoot(document.getElementById('root')!).render(
  <AppErrorBoundary>
    {window.location.hash === '#snippet-export' ? <SnippetExportPage /> : <App />}
  </AppErrorBoundary>,
);
