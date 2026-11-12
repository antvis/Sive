export function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : '操作失败，请稍后重试。';
}

export function readWidth(key: string, fallback: number) {
  try {
    const value = Number(localStorage.getItem(key));
    return Number.isFinite(value) && value > 0 ? value : fallback;
  } catch {
    return fallback;
  }
}

export function saveWidth(key: string, width: number) {
  try {
    localStorage.setItem(key, String(Math.round(width)));
  } catch {
    // Resizing still works when storage is unavailable.
  }
}
