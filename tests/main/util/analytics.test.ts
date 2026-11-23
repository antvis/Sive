import { app } from 'electron';
import { init } from '@posthog/electron/main';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { initializeAnalytics } from '../../../src/main/util/analytics';

vi.mock('electron', () => ({ app: { isPackaged: true } }));
vi.mock('@posthog/electron/main', () => ({ init: vi.fn() }));

const capture = vi.fn();
const mockedApp = app as unknown as { isPackaged: boolean };

beforeEach(() => {
  vi.clearAllMocks();
  mockedApp.isPackaged = true;
  vi.mocked(init).mockReturnValue({ capture } as never);
});

describe('initializeAnalytics', () => {
  it('captures only the startup event in packaged apps', () => {
    initializeAnalytics();

    expect(init).toHaveBeenCalledWith(
      expect.objectContaining({
        projectToken: expect.stringMatching(/^phc_/),
        host: 'https://us.i.posthog.com',
        captureAppLifecycleEvents: false,
        disableRemoteConfig: true,
        disableRemoteFeatureFlags: true,
        disableGeoip: true,
        flushAt: 1,
      }),
    );
    expect(capture).toHaveBeenCalledExactlyOnceWith('app_started', { os_arch: process.arch });
  });

  it('does not initialize analytics in development', () => {
    mockedApp.isPackaged = false;

    initializeAnalytics();

    expect(init).not.toHaveBeenCalled();
    expect(capture).not.toHaveBeenCalled();
  });
});
