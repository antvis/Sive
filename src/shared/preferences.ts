import { z } from 'zod';

export const preferencesStorageKey = 'sive.preferences.v1';
export const preferencesSchema = z.object({
  sendShortcut: z.enum(['enter', 'mod-enter']),
  analysisMode: z.enum(['direct', 'loop']),
  previewPageSize: z.union([z.literal(50), z.literal(100), z.literal(200)]),
});
export type Preferences = z.infer<typeof preferencesSchema>;
export const defaultPreferences: Preferences = {
  sendShortcut: 'enter',
  analysisMode: 'direct',
  previewPageSize: 100,
};

export function restorePreferences(serialized: string | null): Preferences {
  try {
    const parsed = preferencesSchema.partial().parse(JSON.parse(serialized || '{}'));
    return { ...defaultPreferences, ...parsed };
  } catch {
    return { ...defaultPreferences };
  }
}

export function savePreferences(storage: Pick<Storage, 'setItem'>, value: Preferences) {
  const next = preferencesSchema.parse(value);
  storage.setItem(preferencesStorageKey, JSON.stringify(next));
  return next;
}

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
