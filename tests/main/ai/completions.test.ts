import { afterEach, expect, it, vi } from 'vitest';
import { generateConversationTitle } from '../../../src/main/ai/completions';

afterEach(() => vi.unstubAllGlobals());

it.each([
  { text: '  📊月度销量趋势图  ', expected: '📊 月度销量趋势图' },
  { text: '月度销量趋势图', expected: undefined },
  { text: '🚀 月度销量趋势图', expected: undefined },
  { text: '📊', expected: undefined },
])('validates and formats the generated title: $text', async ({ text, expected }) => {
  vi.stubGlobal('fetch', async () =>
    Response.json({
      id: 'title-response',
      model: 'test',
      choices: [{ index: 0, message: { role: 'assistant', content: text }, finish_reason: 'stop' }],
    }),
  );

  await expect(
    generateConversationTitle('画一下月度销量趋势图', {
      baseURL: 'https://example.com/v1',
      model: 'test',
    }),
  ).resolves.toBe(expected);
});
