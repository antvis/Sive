import { useEffect, useState } from 'react';
import type { AnalysisSession, AnalysisUpdate } from '@shared/api';
import { errorMessage } from '../utils';

function emptySession(): AnalysisSession {
  return { messages: [], update: { running: false, message: null } };
}

function mergeUpdate(session: AnalysisSession, update: AnalysisUpdate): AnalysisSession {
  const message = update.message;
  const messages = !message
    ? session.messages
    : session.messages.some((item) => item.id === message.id)
      ? session.messages.map((item) => (item.id === message.id ? message : item))
      : [...session.messages, message];
  return { messages, update };
}

export function useAnalysis(id: string, exists: boolean) {
  const [state, setState] = useState({ id, session: emptySession(), loading: exists });
  const [error, setError] = useState('');

  useEffect(() => {
    let live = true;
    let loaded = !exists;
    const pending: AnalysisUpdate[] = [];
    setState({ id, session: emptySession(), loading: exists });
    setError('');
    // Subscribe before loading so a result arriving during the IPC request is not lost.
    const unsubscribe = window.workbench.analysisOnChunk((conversationId, update) => {
      if (conversationId !== id) return;
      if (!loaded) {
        pending.push(update);
        return;
      }
      setState((current) => ({ id, session: mergeUpdate(current.session, update), loading: false }));
    });
    if (exists) {
      window.workbench
        .analysisGetMessages(id)
        .then((initial) => {
          if (!live) return;
          setState({ id, session: pending.reduce(mergeUpdate, initial), loading: false });
          pending.length = 0;
          loaded = true;
        })
        .catch((cause) => {
          if (!live) return;
          loaded = true;
          pending.length = 0;
          setError(errorMessage(cause));
          setState((current) => ({ ...current, loading: false }));
        });
    }

    return () => {
      live = false;
      unsubscribe();
    };
  }, [id, exists]);

  return state.id === id ? { ...state, error } : { id, session: emptySession(), loading: true, error: '' };
}
