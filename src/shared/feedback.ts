export function errorMessage(error: unknown) {
  const text =
    error instanceof Error ? error.message : typeof error === 'string' ? error : '操作未完成，请重试。';
  return text.replace(/^Error invoking remote method '[^']+':\s*/, '').replace(/^(?:Error:\s*)+/, '');
}
