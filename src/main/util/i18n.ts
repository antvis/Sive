import { DEFAULT_PREFERENCES, type Preferences } from '../../shared/api';
import { getMessages, type MessageKey } from '../../shared/i18n';

let locale: Preferences['language'] = DEFAULT_PREFERENCES.language;

function getLocale() {
  return locale;
}

/**
 * Get the localized message corresponding to the given key based on the current locale.
 * @param key The key of the localized message to retrieve.
 * @returns The localized message corresponding to the given key.
 */
export function i18n(key: MessageKey) {
  return getMessages(getLocale())[key];
}

/**
 * Set the current locale for the application. This function updates the global locale variable,
 *  which is used by the i18n function to retrieve localized messages.
 * @param language
 */
export function setLocale(language: Preferences['language']) {
  locale = language;
}
