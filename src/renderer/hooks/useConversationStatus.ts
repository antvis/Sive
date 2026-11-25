import { useEffect, useSyncExternalStore } from 'react';
import type { AnalysisStatus } from '@shared/api';

const CHANGED = 'sive:conversation-status';
const running = new Set<string>();

const unreadKey = (id: string) => `sive.conversation-unread.${id}`;

function notify() {
  window.dispatchEvent(new Event(CHANGED));
}

function subscribe(listener: () => void) {
  window.addEventListener(CHANGED, listener);
  window.addEventListener('storage', listener);
  return () => {
    window.removeEventListener(CHANGED, listener);
    window.removeEventListener('storage', listener);
  };
}

export function syncRunningConversations(ids: string[]) {
  if (ids.length === running.size && ids.every((id) => running.has(id))) return;
  running.clear();
  for (const id of ids) {
    running.add(id);
    localStorage.removeItem(unreadKey(id));
  }
  notify();
}

export function updateConversationStatus(id: string, update: AnalysisStatus) {
  if (update.status === 'running') {
    if (running.has(id)) return;
    running.add(id);
    clearConversationUnread(id);
  } else {
    running.delete(id);
    if (update.status !== 'stopped') {
      localStorage.setItem(unreadKey(id), update.runId);
    }
    notify();
  }
}

export function clearConversationUnread(id: string) {
  localStorage.removeItem(unreadKey(id));
  notify();
}

export function useConversationStatus(id: string | string[]) {
  const ids = typeof id === 'string' ? [id] : id;
  return useSyncExternalStore(subscribe, () => {
    if (ids.some((id) => running.has(id))) return 'running';
    return ids.some((id) => localStorage.getItem(unreadKey(id))) ? 'unread' : 'idle';
  });
}

export function useConversationRead(id: string, ready: boolean) {
  const status = useConversationStatus(id);

  useEffect(() => {
    if (!ready || status !== 'unread') return;

    const markRead = () => {
      if (document.visibilityState === 'visible' && document.hasFocus()) clearConversationUnread(id);
    };
    markRead();
    window.addEventListener('focus', markRead);
    document.addEventListener('visibilitychange', markRead);
    return () => {
      window.removeEventListener('focus', markRead);
      document.removeEventListener('visibilitychange', markRead);
    };
  }, [id, ready, status]);
}
