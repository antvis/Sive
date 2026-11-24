import type { ErrorEvent, EventHint } from '@sentry/electron/main';
import { describe, expect, it } from 'vitest';
import { sanitizeEventEnvelope } from '../../../src/main/util/sentry/privacy';

const secrets = [
  'SELECT * FROM customer',
  '张三的信用卡号',
  'Bearer secret-token',
  '/Users/alice/private/customer.csv',
  'C:\\Users\\alice\\private\\customer.csv',
];

describe('Sentry event privacy', () => {
  it('removes user data, raw messages and sensitive stack frame fields', () => {
    const event: ErrorEvent = {
      type: undefined,
      event_id: 'event-id',
      timestamp: 123,
      platform: 'node',
      release: 'sive@0.1.0',
      environment: 'production',
      message: 'Failed to run SELECT * FROM customer',
      exception: {
        values: [
          {
            type: 'DatabaseError',
            value: 'SELECT * FROM customer returned 张三的信用卡号',
            mechanism: { type: 'generic', handled: false, data: { sql: 'SELECT * FROM customer' } },
            stacktrace: {
              frames: [
                {
                  filename: '/Users/alice/private/customer.csv',
                  abs_path: '/Users/alice/private/customer.csv',
                  function: 'runQuery',
                  lineno: 42,
                  colno: 7,
                  in_app: true,
                  vars: { sql: 'SELECT * FROM customer', result: '张三的信用卡号' },
                  context_line: 'SELECT * FROM customer',
                },
                { filename: 'app:///dist-electron/main.cjs', function: 'analyze', lineno: 10 },
                { filename: 'C:\\Users\\alice\\private\\customer.csv', function: 'read' },
              ],
            },
          },
        ],
      },
      breadcrumbs: [{ message: 'AI prompt: SELECT * FROM customer' }],
      request: {
        url: 'https://example.com/?query=SELECT * FROM customer',
        headers: { Authorization: 'Bearer secret-token' },
      },
      user: { id: 'alice', email: 'ali***@example.com' },
      extra: { prompt: 'SELECT * FROM customer' },
      contexts: {
        app: { app_name: 'Sive', app_version: '0.1.0', app_arch: 'arm64', app_memory: 123 },
        os: { name: 'macOS', version: '15.0' },
      },
      tags: { 'event.process': 'renderer' },
    };

    const result = sanitizeEventEnvelope(event, {});
    const serialized = JSON.stringify(result);
    const exception = result.exception?.values?.[0];
    const frames = exception?.stacktrace?.frames;

    for (const secret of secrets) expect(serialized).not.toContain(secret);
    expect(result.release).toBe('sive@0.1.0');
    expect(exception).toMatchObject({
      type: 'DatabaseError',
      value: 'Application exception',
      mechanism: { type: 'generic', handled: false },
    });
    expect(exception?.mechanism?.data).toBeUndefined();
    expect(frames?.[0]).toMatchObject({
      function: 'runQuery',
      filename: '<redacted>',
      lineno: 42,
      colno: 7,
      in_app: true,
    });
    expect(frames?.[0]?.vars).toBeUndefined();
    expect(frames?.[0]?.abs_path).toBeUndefined();
    expect(frames?.[0]?.context_line).toBeUndefined();
    expect(frames?.[1]?.filename).toBe('app:///dist-electron/main.cjs');
    expect(frames?.[2]?.filename).toBe('<redacted>');
    expect(result.contexts?.app).toMatchObject({ app_name: 'Sive', app_version: '0.1.0' });
    expect(result.tags).toEqual({ 'event.process': 'renderer' });
    expect(result.breadcrumbs).toBeUndefined();
    expect(result.request).toBeUndefined();
    expect(result.user).toBeUndefined();
    expect(result.extra).toBeUndefined();
  });

  it('replaces free-form messages and unsafe error types', () => {
    const result = sanitizeEventEnvelope(
      {
        type: undefined,
        platform: 'node',
        message: 'SELECT * FROM customer',
        exception: { values: [{ type: 'SELECT * FROM customer', value: 'SELECT * FROM customer' }] },
      },
      {},
    );
    expect(result.message).toBeUndefined();
    expect(result.exception?.values?.[0]?.type).toBe('Error');
    expect(JSON.stringify(result)).not.toContain('SELECT * FROM customer');

    expect(sanitizeEventEnvelope({ type: undefined, platform: 'node', message: 'SELECT * FROM customer' }, {}).message).toBe(
      'Application diagnostic event',
    );
  });

  it('drops JavaScript attachments but preserves opted-in native minidumps', () => {
    const attachment = { filename: 'crash.dmp', data: new Uint8Array([1, 2, 3]) };
    const javascriptHint: EventHint = { attachments: [attachment] };
    const nativeHint: EventHint = { attachments: [attachment] };

    sanitizeEventEnvelope({ type: undefined, platform: 'node' }, javascriptHint);
    sanitizeEventEnvelope({ type: undefined, platform: 'native' }, nativeHint);

    expect(javascriptHint.attachments).toBeUndefined();
    expect(nativeHint.attachments).toEqual([attachment]);
  });

  it('preserves native symbolication fields', () => {
    const event: ErrorEvent = {
      type: undefined,
      platform: 'native',
      exception: {
        values: [
          {
            type: 'NativeError',
            value: 'Native crash',
            stacktrace: {
              frames: [{ filename: '/usr/lib/libexample.dylib', instruction_addr: '0x1000' }],
            },
          },
        ],
      },
      debug_meta: { images: [] },
      threads: { values: [{ id: 1, stacktrace: { frames: [{ instruction_addr: '0x1000' }] } }] },
    };

    const result = sanitizeEventEnvelope(event, {});
    const frame = result.exception?.values?.[0]?.stacktrace?.frames?.[0];
    expect(frame?.instruction_addr).toBe('0x1000');
    expect(frame?.filename).toBe('/usr/lib/libexample.dylib');
    expect(result.debug_meta).toEqual({ images: [] });
    expect(result.threads?.values?.[0]?.stacktrace?.frames?.[0]?.instruction_addr).toBe('0x1000');
  });
});
