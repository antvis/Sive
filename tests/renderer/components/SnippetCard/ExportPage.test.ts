import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../../src/renderer/theme', () => ({ ThemeContext: {} }));
vi.mock('../../../../src/renderer/components/SnippetCard/index', () => ({ SnippetCard: () => null }));

import { waitForRendering } from '../../../../src/renderer/components/SnippetCard/ExportPage';

describe('snippet export rendering readiness', () => {
  let now: number;

  beforeEach(() => {
    now = 0;
    vi.spyOn(performance, 'now').mockImplementation(() => now);
    vi.stubGlobal('document', { fonts: { ready: Promise.resolve() } });
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
      queueMicrotask(() => {
        now += 50;
        callback(now);
      });
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  function container(pixels: () => string, height = () => 1200) {
    return {
      innerHTML: '<canvas></canvas>',
      getBoundingClientRect: () => ({ width: 800, height: height() }),
      querySelectorAll: (selector: string) => (selector === 'canvas' ? [{ toDataURL: pixels }] : []),
    } as unknown as HTMLElement;
  }

  it('waits for entrance animation pixels to settle', async () => {
    await waitForRendering(container(() => String(Math.min(now, 800))));
    expect(now).toBeGreaterThanOrEqual(1100);
    expect(now).toBeLessThan(1500);
  });

  it('captures continuous canvas animation after layout settles instead of timing out', async () => {
    await waitForRendering(container(() => String(now)));
    expect(now).toBeGreaterThanOrEqual(2000);
    expect(now).toBeLessThan(2500);
  });

  it('restarts the stability window when long content changes height', async () => {
    await waitForRendering(
      container(
        () => 'static',
        () => (now < 250 ? 800 + now : 1200),
      ),
    );
    expect(now).toBeGreaterThanOrEqual(550);
  });

  it('rejects a page whose layout never settles', async () => {
    await expect(
      waitForRendering(
        container(
          () => 'static',
          () => now,
        ),
      ),
    ).rejects.toThrow('仍在渲染');
  });
});
