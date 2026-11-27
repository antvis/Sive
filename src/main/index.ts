import { app } from 'electron';
import { captureException, flush } from '@sentry/electron/main';
import { DBConnection } from './db';
import { registerIpc } from './ipc';
import { setLocale } from './util/i18n';
import { updateApplicationMenu } from './menu';
import { createServices } from './services';
import { initializeSentry } from './util/sentry';
import { initializeAnalytics } from './util/analytics';
import { appIconPath, closeAppWindow, isAppWindowOpen, openAppWindow } from './windows';

let database: DBConnection | undefined;

async function initialize() {
  if (process.platform === 'darwin') app.dock?.setIcon(appIconPath);
  database = await DBConnection.connect(app.getPath('userData'));

  const services = createServices(database);
  const preferences = services.settings.getPreferences();
  // Initialize the locale before creating the window to ensure that the UI is displayed in the correct language.
  setLocale(preferences.language);
  updateApplicationMenu();
  // Initialize Sentry after the locale is set to ensure that any error messages are localized.
  initializeSentry(preferences.diagnostics.nativeCrashReporting);
  // Initialize PostHog analytics after the locale is set to ensure that any error messages are localized.
  initializeAnalytics();
  registerIpc(services, {
    open: () => openAppWindow('settings'),
    close: (sender) => closeAppWindow('settings', sender),
  });
  await openAppWindow('workspace');
  services.update.setAutomatic(preferences.autoCheckUpdates);
}

void app
  .whenReady()
  .then(initialize)
  .catch((error: unknown) => {
    console.error('Failed to initialize the main process.', error);
    captureException(error);
    void flush(2000).finally(() => app.quit());
  });

app.on('activate', () => {
  if (database && !isAppWindowOpen('workspace')) void openAppWindow('workspace').catch(captureException);
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('will-quit', () => {
  database?.close();
  database = undefined;
});
