import { useCallback, useEffect, useRef, useState } from 'react';
import type { WorkspaceState } from '../types';
import { errorMessage } from '../utils';

export function useWorkspace() {
  const [state, setState] = useState<WorkspaceState | null>(null);
  const [error, setError] = useState('');
  const requestId = useRef(0);

  const refresh = useCallback(async () => {
    const request = ++requestId.current;
    try {
      const next = await window.workbench.workspaceGetState();
      if (request !== requestId.current) return;
      setState(next);
      setError('');
    } catch (cause) {
      if (request !== requestId.current) return;
      setError(errorMessage(cause));
    }
  }, []);

  useEffect(() => {
    const unsubscribe = window.workbench.workspaceOnChange(() => void refresh());
    void refresh();
    return () => {
      requestId.current += 1;
      unsubscribe();
    };
  }, [refresh]);

  return { state, error, refresh };
}
