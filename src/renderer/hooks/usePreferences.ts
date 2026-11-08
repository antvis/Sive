import { createContext, useContext } from 'react';
import type { Preferences } from '@renderer/data/preferences';
export const PreferencesContext = createContext<{
  preferences: Preferences;
  updatePreferences: (patch: Partial<Preferences>) => boolean;
} | null>(null);

export function usePreferences() {
  const value = useContext(PreferencesContext);
  if (!value) throw new Error('PreferencesProvider is missing');
  return value;
}
