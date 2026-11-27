import { DEFAULT_PREFERENCES, type Preferences } from '@shared/api';
import { translate, type MessageKey, type MessageValues, type Translator } from '@shared/i18n';
import { useSyncExternalStore } from 'react';

const STORAGE_KEY = 'sive.interface-language';
let locale: Preferences['language'] = DEFAULT_PREFERENCES.language;

try {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved === 'zh-CN' || saved === 'en-US') locale = saved;
} catch {
  // Workspace preferences remain authoritative when local storage is unavailable.
}

const listeners = new Set<() => void>();

const subscribe = (listener: () => void) => {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
};

const getLocale = () => locale;

// The stable function also serves event callbacks and non-React formatting helpers.
export const i18n = Object.defineProperty(
  (key: MessageKey, values?: MessageValues) => translate(locale, key, values),
  'locale',
  { get: getLocale },
) as Translator;

export function setLocale(language: Preferences['language']) {
  if (language !== 'zh-CN' && language !== 'en-US') return;
  try {
    localStorage.setItem(STORAGE_KEY, language);
  } catch {
    // The cache is only used before the next workspace snapshot arrives.
  }
  if (locale === language) return;
  locale = language;
  listeners.forEach((listener) => listener());
}

/** Use the returned translator in components; memoized translations also depend on i18n.locale. */
export function useI18n() {
  useSyncExternalStore(subscribe, getLocale);
  return i18n;
}
