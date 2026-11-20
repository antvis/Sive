import { app } from 'electron';
import { init, IPCMode } from '@sentry/electron/main';
import { SENTRY_DSN } from '@shared/sentry';
import { sanitizeEventEnvelope } from './privacy';

const ALLOWED_INTEGRATIONS = new Set([
  'ElectronContext',
  'ChildProcess',
  'OnUncaughtException',
  'FunctionToString',
  'LinkedErrors',
  'OnUnhandledRejection',
  'NormalizePaths',
  'NodeContext',
  'EventFilters',
]);

export function initializeSentry(nativeCrashReporting: boolean) {
  init({
    dsn: SENTRY_DSN,
    ipcMode: IPCMode.Classic,
    release: `sive@${app.getVersion()}`,
    environment: app.isPackaged ? 'production' : 'development',
    dataCollection: { userInfo: false },
    sendClientReports: false,
    attachScreenshot: false,
    enableRendererProfiling: false,
    tracesSampleRate: 0,
    maxBreadcrumbs: 0,
    beforeBreadcrumb: () => null,
    beforeSend: sanitizeEventEnvelope,
    integrations: (defaults) =>
      defaults.filter(({ name }) => {
        if (name === 'SentryMinidump') return nativeCrashReporting;
        return ALLOWED_INTEGRATIONS.has(name);
      }),
  });
}
