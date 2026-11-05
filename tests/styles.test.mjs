import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cx } from '../src/shared/cx.ts';

test('component overrides resolve conflicts without losing conditional or axis styles', () => {
  assert.equal(
    cx('px-4 py-2 h-8 hover:bg-surface', false && 'hidden', { flex: true }, ['px-0 h-auto hover:bg-accent']),
    'py-2 flex px-0 h-auto hover:bg-accent',
  );
});

test('semantic font sizes preserve independent colors, line heights and font families', () => {
  assert.equal(
    cx('leading-none text-body text-muted font-[family-name:inherit]', 'text-caption text-ink font-semibold'),
    'leading-none font-[family-name:inherit] text-caption text-ink font-semibold',
  );
  assert.equal(cx('text-body leading-none', 'text-title leading-tight'), 'text-title leading-tight');
});
