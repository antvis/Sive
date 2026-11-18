import assert from 'node:assert/strict';
import { test } from 'node:test';
import { detectDevice } from './device.js';

test('CPU hints distinguish Mac chips; MacIntel alone never implies an Intel chip', () => {
  assert.deepEqual(detectDevice({ platform: 'MacIntel', architecture: 'arm', bitness: '64' }), {
    platform: 'mac',
    architecture: 'arm64',
  });
  assert.equal(detectDevice({ platform: 'macOS', architecture: 'x86', bitness: '64' }).architecture, 'x64');
  assert.equal(detectDevice({ platform: 'MacIntel' }).architecture, 'unknown');
});

test('mobile and compatibility user agents are classified before desktop systems', () => {
  assert.equal(detectDevice({ platform: 'MacIntel', maxTouchPoints: 5 }).platform, 'ios');
  assert.equal(detectDevice({ userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel)' }).platform, 'android');
  assert.equal(detectDevice({ userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17)' }).platform, 'ios');
  assert.equal(
    detectDevice({ userAgent: 'Mozilla/5.0 (Linux; Android; HarmonyOS; Mobile)' }).platform,
    'harmony-mobile',
  );
  assert.equal(detectDevice({ platform: 'OpenHarmony' }).platform, 'harmony-desktop');
});

test('Windows ARM64 and unknown platforms remain distinct', () => {
  assert.deepEqual(detectDevice({ platform: 'Windows', architecture: 'arm', bitness: '64' }), {
    platform: 'windows',
    architecture: 'arm64',
  });
  assert.equal(detectDevice({ platform: 'Linux x86_64' }).platform, 'linux');
  assert.deepEqual(detectDevice(), { platform: 'unknown', architecture: 'unknown' });
});
