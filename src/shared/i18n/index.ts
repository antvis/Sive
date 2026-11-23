import type { Preferences } from '../api';
import { enUS } from './en-US';
import { zhCN } from './zh-CN';

export type MessageKey = keyof typeof enUS;

const messages: Record<Preferences['language'], typeof enUS> = {
  'zh-CN': zhCN,
  'en-US': enUS,
};

export function getMessages(language: Preferences['language']) {
  return messages[language];
}
