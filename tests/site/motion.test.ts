import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { describe, expect, it } from 'vitest';

const hero = readFileSync(new URL('../../site/hero.js', import.meta.url), 'utf8');
const download = readFileSync(new URL('../../site/download.js', import.meta.url), 'utf8');

describe('optional site animations', () => {
  it.each([hero, download])('does not touch the page without IntersectionObserver', (script) => {
    expect(() => runInNewContext(script, {})).not.toThrow();
  });

  it('keeps the hero static without ResizeObserver', () => {
    expect(() => runInNewContext(hero, { IntersectionObserver: class {} })).not.toThrow();
  });

  it('keeps the hero static when a 2D canvas is unavailable', () => {
    expect(() =>
      runInNewContext(hero, {
        IntersectionObserver: class {},
        ResizeObserver: class {},
        document: {
          querySelector: () => ({}),
          createElement: () => ({ getContext: () => null }),
        },
      }),
    ).not.toThrow();
  });
});
