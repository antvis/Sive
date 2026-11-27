import type { Preferences } from '../api';
import { enUS } from './en-US';
import { zhCN } from './zh-CN';

export type MessageKey = keyof typeof enUS;

export type MessageValues = readonly (string | number | false | undefined | null)[];

export type Translator = ((key: MessageKey, values?: MessageValues) => string) & {
  readonly locale: Preferences['language'];
};

const messages: Record<Preferences['language'], typeof enUS> = {
  'zh-CN': zhCN,
  'en-US': enUS,
};

export function getMessages(language: Preferences['language']) {
  return messages[language] ?? messages['zh-CN'];
}

export function translate(language: Preferences['language'], key: MessageKey, values: MessageValues = []) {
  return getMessages(language)[key].replace(/\{(\d+)\}/g, (placeholder, index: string) =>
    values[Number(index)] === false
      ? ''
      : values[Number(index)] == null
        ? placeholder
        : String(values[Number(index)]),
  );
}

// IPC and saved tool results contain message text, not translation keys.
// Match only known error values; never treat arbitrary content as an i18n key.
const errorKeysByText = new Map<string, MessageKey>();
for (const key of Object.keys(enUS) as MessageKey[]) {
  if (!key.startsWith('errors.')) continue;
  for (const catalog of Object.values(messages)) {
    errorKeysByText.set(catalog[key], key);
  }
}

/** Translate only known application errors, never arbitrary user or provider content. */
export function translateError(language: Preferences['language'], message: string) {
  const text = message.replace(/^Error invoking remote method '[^']+': (?:Error: )?/, '');
  const key = errorKeysByText.get(text);
  return key ? translate(language, key) : text;
}
