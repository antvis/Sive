import { useEffect, useSyncExternalStore } from 'react';
import type { ConversationActivity } from '@shared/api';
import { toast } from 'sonner';
import { errorMessage } from '../utils';

const CHANGED = 'sive:conversation-status';
let activities = new Map<string, ConversationActivity>();

const unreadKey = (id: string) => `sive.conversation-unread.${id}`;

function notify() {
  window.dispatchEvent(new Event(CHANGED));
}

function subscribe(listener: () => void) {
  window.addEventListener(CHANGED, listener);
  return () => window.removeEventListener(CHANGED, listener);
}

export function syncConversationActivities(next: ConversationActivity[]) {
  activities = new Map(next.map((activity) => [activity.conversationId, activity]));
  for (const { conversationId, messageId, status } of next) {
    if (status === 'unread') localStorage.setItem(unreadKey(conversationId), messageId);
    else localStorage.removeItem(unreadKey(conversationId));
  }
  notify();
}

export function clearConversationUnread(id: string, resultId?: string) {
  if (resultId && localStorage.getItem(unreadKey(id)) !== resultId) return;
  const activity = activities.get(id);
  localStorage.removeItem(unreadKey(id));
  notify();
  if (activity?.status === 'unread') {
    void window.workbench.analysisMarkRead(id, activity.messageId).catch((cause) => {
      toast.error(errorMessage(cause));
    });
  }
}

export function useConversationActivity(id: string) {
  return useSyncExternalStore(subscribe, () => activities.get(id));
}

export function useConversationStatus(id: string | string[]) {
  const ids = typeof id === 'string' ? [id] : id;
  return useSyncExternalStore(subscribe, () => {
    if (ids.some((id) => activities.get(id)?.status === 'running')) return 'running';
    return ids.some((id) => localStorage.getItem(unreadKey(id))) ? 'unread' : 'idle';
  });
}

export function useConversationRead(id: string, ready: boolean) {
  const status = useConversationStatus(id);
  const resultId = localStorage.getItem(unreadKey(id));

  useEffect(() => {
    if (!ready || status !== 'unread' || !resultId) return;

    const markRead = () => {
      if (document.visibilityState === 'visible' && document.hasFocus()) clearConversationUnread(id, resultId);
    };
    markRead();
    window.addEventListener('focus', markRead);
    document.addEventListener('visibilitychange', markRead);
    return () => {
      window.removeEventListener('focus', markRead);
      document.removeEventListener('visibilitychange', markRead);
    };
  }, [id, ready, status, resultId]);
}
