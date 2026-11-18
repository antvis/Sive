import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, access } from 'node:fs/promises';
import { format } from 'prettier';

const root = new URL('./', import.meta.url);
const html = await readFile(new URL('index.html', root), 'utf8');

test('page HTML parses without malformed or missing closing tags', async () => {
  await assert.doesNotReject(() => format(html, { parser: 'html' }));
});

test('the static page ships all referenced local assets', async () => {
  for (const [, path] of html.matchAll(/(?:src|href)="(\.\/[^"#]+)"/g)) {
    await access(new URL(path, root));
  }
});

test('demo images have reserved dimensions and navigation anchors resolve', () => {
  const images = [...html.matchAll(/<img\b[^>]*class="demo-image"[^>]*>/g)];
  assert.equal(images.length, 5);
  images.forEach(([tag]) => {
    assert.match(tag, /width="1440"/);
    assert.match(tag, /height="900"/);
  });
  const ids = new Set([...html.matchAll(/\bid="([^"]+)"/g)].map((match) => match[1]));
  for (const [, id] of html.matchAll(/href="#([^\"]+)"/g)) assert.ok(ids.has(id), id);
});
