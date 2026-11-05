import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  defaultPreferences,
  restorePreferences,
  savePreferences,
  preferencesStorageKey,
  isSendKey,
} from '../src/shared/preferences.ts';

test('preferences persist, merge older fields, and recover malformed storage', () => {
  const values = new Map();
  const storage = { setItem: (key, value) => values.set(key, value) };
  const next = {
    ...defaultPreferences,
    previewPageSize: 200,
    analysisMode: 'loop',
    sendShortcut: 'mod-enter',
  };
  savePreferences(storage, next);
  assert.deepEqual(restorePreferences(values.get(preferencesStorageKey)), next);
  assert.deepEqual(
    restorePreferences(JSON.stringify({ ...next, density: 'comfortable', reduceMotion: true })),
    next,
  );
  assert.deepEqual(restorePreferences('{"previewPageSize":50}'), {
    ...defaultPreferences,
    previewPageSize: 50,
  });
  for (const value of [null, 'bad JSON', 'null', '[]', '{"previewPageSize":100000}'])
    assert.deepEqual(restorePreferences(value), defaultPreferences);
  assert.throws(() => savePreferences(storage, { ...next, previewPageSize: 100000 }));
  assert.throws(
    () =>
      savePreferences(
        {
          setItem: () => {
            throw new Error('quota');
          },
        },
        next,
      ),
    /quota/,
  );
});

test('send shortcut respects platform, composition, newline and modifier keys', () => {
  const enter = {
    key: 'Enter',
    shiftKey: false,
    altKey: false,
    metaKey: false,
    ctrlKey: false,
    isComposing: false,
  };
  assert.equal(isSendKey(enter, 'enter', true), true);
  assert.equal(isSendKey(enter, 'mod-enter', true), false);
  assert.equal(isSendKey({ ...enter, metaKey: true }, 'mod-enter', true), true);
  assert.equal(isSendKey({ ...enter, ctrlKey: true }, 'mod-enter', false), true);
  assert.equal(isSendKey({ ...enter, ctrlKey: true }, 'mod-enter', true), false);
  assert.equal(isSendKey({ ...enter, metaKey: true }, 'mod-enter', false), false);
  for (const patch of [{ shiftKey: true }, { altKey: true }, { isComposing: true }, { key: 'a' }]) {
    assert.equal(isSendKey({ ...enter, ...patch }, 'enter', true), false);
    assert.equal(isSendKey({ ...enter, metaKey: true, ...patch }, 'mod-enter', true), false);
  }
  assert.equal(isSendKey({ ...enter, metaKey: true }, 'enter', true), false);
});
