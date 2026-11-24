import { DEFAULT_PREFERENCES, type Preferences } from '@shared/api';
import { getMessages, type MessageKey } from '@shared/i18n';
import { createContext, useContext, type PropsWithChildren } from 'react';

const I18nContext = createContext<((key: MessageKey) => string) | null>(null);

export function I18nProvider({
  language,
  children,
}: PropsWithChildren<{ language?: Preferences['language'] }>) {
  const messages = getMessages(language ?? DEFAULT_PREFERENCES.language);

  const i18n = (key: MessageKey) => messages[key];

  return <I18nContext.Provider value={i18n}>{children}</I18nContext.Provider>;
}

/**
 * A custom hook that provides access to the i18n function for retrieving localized messages.
 */
export function useI18n() {
  const i18n = useContext(I18nContext);
  if (!i18n) throw new Error('useI18n must be used within I18nProvider.');
  return i18n;
}
