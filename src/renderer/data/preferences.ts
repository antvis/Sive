import { z } from 'zod';
import { analysisModeSchema } from '@shared/inputSchemas';

export const preferencesStorageKey = 'sive.preferences.v1';
const preferencesSchema = z.object({
  sendShortcut: z.enum(['enter', 'mod-enter']),
  analysisMode: analysisModeSchema,
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
    const stored = JSON.parse(serialized || '{}');
    const parsed = preferencesSchema.partial().parse({
      ...stored,
      analysisMode: analysisModeSchema.safeParse(stored.analysisMode).success
        ? stored.analysisMode
        : defaultPreferences.analysisMode,
    });
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
