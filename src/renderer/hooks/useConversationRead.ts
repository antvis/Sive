import { useEffect, useState } from 'react';
import type { WorkspaceState } from '../types';

const storageKey = 'sive.conversation-read.v1';

export function useConversationRead(state: WorkspaceState | null, conversationId: string | null) {
  const [positions, setPositions] = useState<Record<string, number>>(() => {
    try {
      const value: unknown = JSON.parse(localStorage.getItem(storageKey) || '{}');
      if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
      return Object.fromEntries(
        Object.entries(value).filter(([, sequence]) => Number.isSafeInteger(sequence) && sequence >= 0),
      );
    } catch {
      return {};
    }
  });
  const sequence =
    state?.analysisTasks.find((task) => task.conversationId === conversationId)?.completedSequence ?? -1;

  useEffect(() => {
    if (!state) return;
    const validIds = new Set([...state.conversations, ...state.archivedConversations].map((item) => item.id));

    setPositions((current) => {
      const entries = Object.entries(current).filter(([id]) => validIds.has(id));
      return entries.length === Object.keys(current).length ? current : Object.fromEntries(entries);
    });
  }, [state]);

  useEffect(() => {
    if (!conversationId || sequence < 0) return;

    const markRead = () => {
      if (document.visibilityState !== 'visible' || !document.hasFocus()) return;
      setPositions((current) =>
        sequence <= (current[conversationId] ?? -1) ? current : { ...current, [conversationId]: sequence },
      );
    };
    markRead();
    window.addEventListener('focus', markRead);
    document.addEventListener('visibilitychange', markRead);
    return () => {
      window.removeEventListener('focus', markRead);
      document.removeEventListener('visibilitychange', markRead);
    };
  }, [conversationId, sequence]);

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(positions));
    } catch {
      // Keep read indicators usable for this session when storage is unavailable.
    }
  }, [positions]);

  return positions;
}
