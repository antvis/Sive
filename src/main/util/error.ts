export function errorText(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}
