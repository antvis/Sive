export function errorMessage(error: unknown) {
  let text = '操作未完成，请重试。';
  if (typeof error === 'string') text = error;
  if (error instanceof Error) text = error.message;
  return text.replace(/^Error invoking remote method '[^']+':\s*/, '').replace(/^(?:Error:\s*)+/, '');
}
