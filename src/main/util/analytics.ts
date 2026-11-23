import { app } from 'electron';
import { init } from '@posthog/electron/main';

const POSTHOG_PROJECT_TOKEN = 'phc_wpsYmPbWC54KqHzBJCwwDGyr43CDaayTNoWmM6Np8pQA';
const POSTHOG_HOST = 'https://us.i.posthog.com';

export function initializeAnalytics() {
  if (!app.isPackaged) return;

  try {
    const posthog = init({
      projectToken: POSTHOG_PROJECT_TOKEN,
      host: POSTHOG_HOST,
      captureAppLifecycleEvents: false,
      disableRemoteConfig: true,
      disableRemoteFeatureFlags: true,
      disableGeoip: true,
      flushAt: 1,
      onError: (error) => console.error('[PostHog]', error),
    });

    posthog.capture('app_started', { os_arch: process.arch });
  } catch (error) {
    console.error('Failed to initialize PostHog.', error);
  }
}
