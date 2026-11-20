import { createServer } from 'node:http';
import { SUPABASE_REDIRECT_URL } from './oauth-provider';

const CALLBACK_TIMEOUT_MS = 5 * 60 * 1000;

export type LoopbackCallback = {
  wait(): Promise<URLSearchParams>;
  close(): Promise<void>;
};

export function startLoopbackCallback(): Promise<LoopbackCallback> {
  let resolveCallback!: (params: URLSearchParams) => void;
  let rejectCallback!: (error: Error) => void;
  let settled = false;
  const params = new Promise<URLSearchParams>((resolve, reject) => {
    resolveCallback = resolve;
    rejectCallback = reject;
  });
  params.catch(() => {});

  const expected = new URL(SUPABASE_REDIRECT_URL);
  const server = createServer((request, response) => {
    response.setHeader('Cache-Control', 'no-store');
    response.setHeader('Connection', 'close');
    response.setHeader('Content-Security-Policy', "default-src 'none'");
    response.setHeader('Content-Type', 'text/plain; charset=utf-8');

    const url = new URL(request.url ?? '/', SUPABASE_REDIRECT_URL);
    if (
      request.method !== 'GET' ||
      request.headers.host !== expected.host ||
      url.pathname !== expected.pathname ||
      settled
    ) {
      response.writeHead(404).end('Not found');
      return;
    }

    settled = true;
    clearTimeout(timeout);
    if (url.searchParams.has('error')) {
      response.writeHead(400).end('Authorization failed. Return to Sive.');
      rejectCallback(new Error('Supabase 授权已取消或失败。'));
      return;
    }
    response.writeHead(200).end('授权已完成，可以关闭此页面并返回 Sive。');
    resolveCallback(url.searchParams);
  });

  const timeout = setTimeout(() => {
    if (settled) return;
    settled = true;
    rejectCallback(new Error('Supabase 授权超时，请重试。'));
    server.close();
  }, CALLBACK_TIMEOUT_MS);

  return new Promise((resolve, reject) => {
    server.once('error', (error) => {
      clearTimeout(timeout);
      settled = true;
      rejectCallback(error);
      reject(error);
    });
    server.listen(Number(expected.port), expected.hostname, () => {
      resolve({
        wait: () => params,
        close: () =>
          new Promise<void>((resolveClose) => {
            clearTimeout(timeout);
            if (!server.listening) {
              resolveClose();
              return;
            }
            server.closeIdleConnections();
            server.close(() => resolveClose());
          }),
      });
    });
  });
}
