export function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : '操作失败，请稍后重试。';
}

export function formatMessageTime(value: string, now = new Date()) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  const time = date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false });
  if (date.toDateString() === now.toDateString()) return time;

  const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6);
  if (date >= weekStart && date <= now) {
    return `${date.toLocaleDateString('zh-CN', { weekday: 'long' })} ${time}`;
  }

  const day = date.toLocaleDateString('zh-CN', {
    year: date.getFullYear() === now.getFullYear() ? undefined : 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return `${day} ${time}`;
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

export function formatMetric(value: number) {
  return value.toLocaleString('zh-CN', { maximumFractionDigits: 2 });
}
