import { useCallback, useEffect, useState } from 'react';
import type { WorkspaceState } from '../types';
import { errorMessage } from '../utils';
import { syncConversationActivities } from './useConversationStatus';
import { setLocale } from '../i18n';

export function useWorkspace() {
  const [state, setState] = useState<WorkspaceState | null>(null);
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    try {
      const next = await window.workbench.workspaceGetState();
      setLocale(next.preferences.language);
      syncConversationActivities(next.conversationActivities);
      setState(next);
      setError('');
    } catch (cause) {
      setError(errorMessage(cause));
    }
  }, []);

  useEffect(() => {
    void refresh();
    return window.workbench.workspaceOnChange(() => void refresh());
  }, [refresh]);

  return { state, error, refresh };
}
