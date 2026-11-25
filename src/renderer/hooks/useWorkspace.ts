import { useCallback, useEffect, useRef, useState } from 'react';
import type { WorkspaceState } from '../types';
import { errorMessage } from '../utils';
import { syncRunningConversations, updateConversationStatus } from './useConversationStatus';

export function useWorkspace() {
  const [state, setState] = useState<WorkspaceState | null>(null);
  const [error, setError] = useState('');
  const requestId = useRef(0);

  const refresh = useCallback(async () => {
    const id = ++requestId.current;
    try {
      const next = await window.workbench.workspaceGetState();
      if (id !== requestId.current) return;
      syncRunningConversations(next.runningConversationIds);
      setState(next);
      setError('');
    } catch (cause) {
      if (id === requestId.current) setError(errorMessage(cause));
    }
  }, []);

  useEffect(() => {
    const unsubscribeAnalysis = window.workbench.analysisOnStatus((id, update) => {
      requestId.current += 1;
      updateConversationStatus(id, update);
    });
    const unsubscribeWorkspace = window.workbench.workspaceOnChange(() => void refresh());
    void refresh();
    return () => {
      requestId.current += 1;
      unsubscribeAnalysis();
      unsubscribeWorkspace();
    };
  }, [refresh]);

  return { state, error, refresh };
}
