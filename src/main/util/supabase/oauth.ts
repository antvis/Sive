import { i18n } from '../i18n';
import { auth } from '@modelcontextprotocol/client';
import type { SupabaseOAuthCredentials } from '../../db/schema';
import { required } from '../index';
import { startLoopbackCallback } from './loopback';
import { SupabaseOAuthProvider } from './oauth-provider';

const MCP_URL = new URL('https://mcp.supabase.com/mcp?read_only=true&features=account,database');
// Supabase requires database:write for POST /database/query even when read_only is true.
const OAUTH_SCOPES = 'projects:read database:write';

export async function startSupabaseOAuth() {
  let credentials: SupabaseOAuthCredentials = { clients: {} };
  const provider = new SupabaseOAuthProvider(credentials, (updated) => {
    credentials = updated;
  });
  const callback = await startLoopbackCallback();

  try {
    const callbackParams = callback.wait();
    const result = await auth(provider, { serverUrl: MCP_URL, scope: OAUTH_SCOPES });
    if (result === 'REDIRECT') {
      const params = await callbackParams;
      await callback.close();
      if (!provider.lastState || params.get('state') !== provider.lastState) {
        throw new Error(i18n('errors.supabase.stateMismatch'));
      }
      const code = params.get('code');
      if (!code) throw new Error(i18n('errors.supabase.authorizationCodeMissing'));
      await auth(provider, {
        serverUrl: MCP_URL,
        scope: OAUTH_SCOPES,
        authorizationCode: code,
        iss: params.get('iss') ?? undefined,
      });
    }

    const accessToken = required(provider.accessToken, i18n('errors.supabase.tokenMissing'));
    const projects = await listProjects(accessToken);
    return { credentials, projects };
  } finally {
    await callback.close().catch(() => {});
  }
}

export async function refreshSupabaseOAuth(credentials: SupabaseOAuthCredentials) {
  const provider = new SupabaseOAuthProvider(credentials, undefined, false);
  try {
    await auth(provider, { serverUrl: MCP_URL });
    required(provider.accessToken, i18n('errors.supabase.tokenMissing'));
    return provider.credentials;
  } catch {
    throw new Error(i18n('errors.supabase.tokenRefreshFailed'));
  }
}

async function listProjects(accessToken: string) {
  const response = await fetch('https://api.supabase.com/v1/projects', {
    headers: { Authorization: `Bearer ${accessToken}` },
    signal: AbortSignal.timeout(30000),
  });
  if (!response.ok) throw new Error(i18n('errors.supabase.projectsRequestFailed', [response.status]));
  const payload: unknown = await response.json();
  if (!Array.isArray(payload)) throw new Error(i18n('errors.supabase.invalidProjectList'));
  return payload.flatMap((project) =>
    typeof project?.id === 'string' && typeof project?.name === 'string'
      ? [{ id: project.id, name: project.name }]
      : [],
  );
}
