import { createInstance } from 'i18next';
import type { i18n as I18n } from 'i18next';
import zhCN from './zh-CN';
import enUS from './en-US';

export type AppLocale = 'zh-CN' | 'en-US';

export type LanguagePreference = 'system' | AppLocale;

export function isLanguagePreference(value: unknown): value is LanguagePreference {
  return value === 'system' || value === 'zh-CN' || value === 'en-US';
}

export function resolveLocale(preference: LanguagePreference, languages: readonly string[]): AppLocale {
  if (preference !== 'system') return preference;
  for (const language of languages) {
    const tag = language.replaceAll('_', '-').toLowerCase();
    if (tag === 'zh' || tag.startsWith('zh-')) return 'zh-CN';
    if (tag === 'en' || tag.startsWith('en-')) return 'en-US';
  }
  return 'en-US';
}

declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'settings';
    resources: typeof enUS;
    strictKeyChecks: true;
  }
}

export function createI18n(): I18n {
  return createInstance({
    resources: { 'zh-CN': zhCN, 'en-US': enUS },
    supportedLngs: ['zh-CN', 'en-US'],
    fallbackLng: 'en-US',
    load: 'currentOnly',
    defaultNS: 'settings',
    ns: ['settings', 'native'],
    // Bundled resources initialize and switch languages synchronously.
    initAsync: false,
    interpolation: { escapeValue: false },
  });
}
