import type { Preferences } from '@renderer/data/preferences';

export function isSendKey(
  event: {
    key: string;
    shiftKey: boolean;
    altKey: boolean;
    metaKey: boolean;
    ctrlKey: boolean;
    isComposing: boolean;
  },
  shortcut: Preferences['sendShortcut'],
  mac: boolean,
) {
  if (event.key !== 'Enter' || event.shiftKey || event.altKey || event.isComposing) return false;
  return shortcut === 'mod-enter'
    ? mac
      ? event.metaKey && !event.ctrlKey
      : event.ctrlKey && !event.metaKey
    : !event.metaKey && !event.ctrlKey;
}
