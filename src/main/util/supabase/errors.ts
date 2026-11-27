import { i18n } from '../i18n';

export function supabaseError(error: unknown): unknown {
  if (typeof error !== 'object' || error === null || !('status' in error) || error.status !== 403)
    return error;

  let payload: Record<string, unknown> = {};
  if ('detail' in error && typeof error.detail === 'string') {
    try {
      const parsed: unknown = JSON.parse(error.detail);
      if (typeof parsed === 'object' && parsed !== null) payload = parsed as Record<string, unknown>;
    } catch {
      // Ignore non-JSON error responses instead of exposing the full response body.
    }
  }

  const details: string[] = [];
  const missing = payload.missing_permissions;
  if (Array.isArray(missing)) {
    const permissions = missing.filter((item): item is string => typeof item === 'string');
    if (permissions.length) details.push(i18n('errors.oauth.missingPermissions', [permissions.join(', ')]));
  }
  for (const key of ['message', 'hint'] as const) {
    const value = payload[key];
    if (typeof value === 'string' && value.length <= 300) details.push(value);
  }

  return new Error(
    details.length
      ? i18n('errors.supabase.missingPermissions', [details.join('；')])
      : i18n('errors.supabase.insufficientScope'),
    { cause: error },
  );
}
