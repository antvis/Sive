import { useCallback, useEffect, useRef, useState } from 'react';
import type { i18n as I18n } from 'i18next';
import type { WorkspaceState } from '../types';
import { errorMessage } from '../utils';

export function useWorkspace(i18n: I18n) {
  const [state, setState] = useState<WorkspaceState | null>(null);
  const [error, setError] = useState('');
  const request = useRef(0);

  const refresh = useCallback(async () => {
    const current = ++request.current;
    try {
      const next = await window.workbench.workspaceGetState();
      if (current !== request.current) return;
      if (!i18n.isInitialized) await i18n.init({ lng: next.resolvedLocale });
      else if (i18n.language !== next.resolvedLocale) await i18n.changeLanguage(next.resolvedLocale);
      if (current !== request.current) return;
      document.documentElement.lang = next.resolvedLocale;
      setState(next);
      setError('');
    } catch (cause) {
      if (current === request.current) setError(errorMessage(cause));
    }
  }, [i18n]);

  useEffect(() => {
    const unsubscribe = window.workbench.workspaceOnChange(() => void refresh());
    void refresh();
    return () => {
      request.current += 1;
      unsubscribe();
    };
  }, [refresh]);

  return { state, error, refresh };
}
