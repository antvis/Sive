import { useCallback, useEffect, useState } from 'react';
import type { WorkspaceState } from '../types';
import { errorMessage } from '../utils';

export function useWorkspace() {
  const [state, setState] = useState<WorkspaceState | null>(null);
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    try {
      setState(await window.workbench.workspaceGetState());
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
