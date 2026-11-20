import { init } from '@sentry/electron/renderer';

const ALLOWED_INTEGRATIONS = new Set([
  'BrowserApiErrors',
  'GlobalHandlers',
  'FunctionToString',
  'LinkedErrors',
  'Dedupe',
  'ScopeToMain',
]);

export function initializeSentry() {
  init({
    sendDefaultPii: false,
    tracesSampleRate: 0,
    enableLogs: false,
    maxBreadcrumbs: 0,
    beforeBreadcrumb: () => null,
    integrations: (defaults) => defaults.filter(({ name }) => ALLOWED_INTEGRATIONS.has(name)),
  });
}
