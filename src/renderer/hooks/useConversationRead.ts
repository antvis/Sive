import { useCallback, useEffect, useRef, useState } from 'react';
import type { State } from '@shared/contracts';
import {
  advanceConversationRead,
  conversationReadStorageKey,
  pruneConversationRead,
  restoreConversationRead,
  type ConversationReadPositions,
} from '@renderer/data/conversationRead';

export function useConversationRead(
  state: State | null,
  conversationId: string,
  report: (message: string) => void,
) {
  const [positions, setPositions] = useState(() => {
    try {
      return restoreConversationRead(localStorage.getItem(conversationReadStorageKey));
    } catch {
      return {};
    }
  });
  const current = useRef(positions);
  const save = useCallback(
    (next: ConversationReadPositions) => {
      if (next === current.current) return;
      try {
        localStorage.setItem(conversationReadStorageKey, JSON.stringify(next));
        current.current = next;
        setPositions(next);
      } catch {
        report('已读状态未能保存，请检查本地存储后重试。');
      }
    },
    [report],
  );

  useEffect(() => {
    if (!state) return;
    const validIds = new Set([...state.conversations, ...state.deletedConversations].map((c) => c.id));
    save(pruneConversationRead(current.current, validIds));
  }, [state?.conversations, state?.deletedConversations, save]);

  const sequence =
    state?.runs.reduce(
      (latest, run) => (run.conversationId === conversationId ? Math.max(latest, run.sequence) : latest),
      -1,
    ) ?? -1;
  useEffect(() => {
    if (!conversationId || sequence < 0) return;
    const markRead = () => {
      if (document.visibilityState !== 'visible' || !document.hasFocus()) return;
      save(advanceConversationRead(current.current, conversationId, sequence));
    };
    markRead();
    window.addEventListener('focus', markRead);
    document.addEventListener('visibilitychange', markRead);
    return () => {
      window.removeEventListener('focus', markRead);
      document.removeEventListener('visibilitychange', markRead);
    };
  }, [conversationId, sequence, save]);
  return positions;
}
