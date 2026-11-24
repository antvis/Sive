import { useEffect, useSyncExternalStore } from 'react';

const CHANGED = 'sive:conversation-status';
const running = new Set<string>();

const unreadKey = (id: string) => `sive.conversation-unread.${id}`;

function notify() {
  window.dispatchEvent(new Event(CHANGED));
}

function subscribe(listener: () => void) {
  window.addEventListener(CHANGED, listener);
  return () => window.removeEventListener(CHANGED, listener);
}

export function startConversation(id: string) {
  running.add(id);
  clearConversationUnread(id);
}

export function finishConversation(id: string, resultId?: string) {
  running.delete(id);
  if (resultId) localStorage.setItem(unreadKey(id), resultId);
  notify();
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
