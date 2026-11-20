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
    if (permissions.length) details.push(`缺少权限：${permissions.join(', ')}`);
  }
  for (const key of ['message', 'hint'] as const) {
    const value = payload[key];
    if (typeof value === 'string' && value.length <= 300) details.push(value);
  }

  return new Error(
    details.length
      ? `Supabase 权限不足：${details.join('；')}`
      : 'Supabase 权限不足，请检查授权组织、项目范围及 database:read 权限。',
    { cause: error },
  );
}
