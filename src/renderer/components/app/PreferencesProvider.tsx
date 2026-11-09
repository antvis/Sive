import { PreferencesContext } from '@renderer/hooks/usePreferences';
import { useRef, useState, type ReactNode } from 'react';
import { useUI } from '@renderer/hooks/useUI';
import {
  defaultPreferences,
  preferencesStorageKey,
  restorePreferences,
  savePreferences,
  type Preferences,
} from '@renderer/data/preferences';

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
  return (
    <PreferencesContext.Provider value={{ preferences, updatePreferences }}>
      {children}
    </PreferencesContext.Provider>
  );
}
