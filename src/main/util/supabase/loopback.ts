import { i18n } from '../i18n';
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
      response.writeHead(404).end(i18n('errors.oauth.callbackNotFound'));
      return;
    }

    settled = true;
    clearTimeout(timeout);
    if (url.searchParams.has('error')) {
      response.writeHead(400).end(i18n('errors.oauth.callbackFailed'));
      rejectCallback(new Error(i18n('errors.supabase.authorizationCancelled')));
      return;
    }
    response.writeHead(200).end(i18n('oauth.callback.completed'));
    resolveCallback(url.searchParams);
  });

  const timeout = setTimeout(() => {
    if (settled) return;
    settled = true;
    rejectCallback(new Error(i18n('errors.supabase.authorizationTimeout')));
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
