import { createContext, useContext, useRef, useState, type ReactNode } from 'react';
import { useUI } from './components/ui';
import {
  defaultPreferences,
  preferencesStorageKey,
  restorePreferences,
  savePreferences,
  type Preferences,
} from './shared/preferences';

const Context = createContext<{
  preferences: Preferences;
  updatePreferences: (patch: Partial<Preferences>) => boolean;
} | null>(null);

export function usePreferences() {
  const value = useContext(Context);
  if (!value) throw new Error('PreferencesProvider is missing');
  return value;
}

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const { message } = useUI();
  const [preferences, setPreferences] = useState(() => {
    try {
      return restorePreferences(localStorage.getItem(preferencesStorageKey));
    } catch {
      return { ...defaultPreferences };
    }
  });
  const current = useRef(preferences);
  const updatePreferences = (patch: Partial<Preferences>) => {
    try {
      const next = savePreferences(localStorage, { ...current.current, ...patch });
      current.current = next;
      setPreferences(next);
      return true;
    } catch {
      message.error('偏好未能保存，请检查本地存储后重试。');
      return false;
    }
  };
  return <Context.Provider value={{ preferences, updatePreferences }}>{children}</Context.Provider>;
}
