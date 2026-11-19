import { createInstance } from 'i18next';
import type { i18n as I18n } from 'i18next';
import { zhCN } from './zh-CN';
import { enUS } from './en-US';

export type AppLocale = 'zh-CN' | 'en-US';

export type LanguagePreference = 'system' | AppLocale;

export function resolveLocale(preference: LanguagePreference, languages: readonly string[]): AppLocale {
  if (preference !== 'system') return preference;
  for (const language of languages) {
    if (language.startsWith('zh')) return 'zh-CN';
    if (language.startsWith('en')) return 'en-US';
  }
  return 'en-US';
}

declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'translation';
    resources: { translation: typeof enUS };
    strictKeyChecks: true;
  }
}

export function createI18n(): I18n {
  return createInstance({
    resources: { 'zh-CN': { translation: zhCN }, 'en-US': { translation: enUS } },
    supportedLngs: ['zh-CN', 'en-US'],
    fallbackLng: 'en-US',
    load: 'currentOnly',
    // Bundled resources initialize and switch languages synchronously.
    initAsync: false,
    interpolation: { escapeValue: false },
  });
}
