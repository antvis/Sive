import { i18n } from './i18n';
import { translateError } from '@shared/i18n';
import { findDatasetSource } from '@shared/dataSource';

export function datasetSourceLabel(type: string) {
  const source = findDatasetSource(type);
  return source ? i18n(source.labelKey) : type;
}

export function errorMessage(error: unknown) {
  return error instanceof Error ? translateError(i18n.locale, error.message) : i18n('errors.operationFailed');
}

export function formatMessageTime(value: string, now = new Date()) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  const time = date.toLocaleTimeString(i18n.locale, { hour: '2-digit', minute: '2-digit', hour12: false });
  if (date.toDateString() === now.toDateString()) return time;

  const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6);
  if (date >= weekStart && date <= now) {
    return `${date.toLocaleDateString(i18n.locale, { weekday: 'long' })} ${time}`;
  }

  const day = date.toLocaleDateString(i18n.locale, {
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
  return value.toLocaleString(i18n.locale, { maximumFractionDigits: 2 });
}
