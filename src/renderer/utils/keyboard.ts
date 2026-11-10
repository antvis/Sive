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
  if (shortcut === 'enter') return !event.metaKey && !event.ctrlKey;
  return mac ? event.metaKey && !event.ctrlKey : event.ctrlKey && !event.metaKey;
}
