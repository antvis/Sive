import { useEffect, useReducer, useRef } from 'react';
import type { State } from '../../shared/contracts';
import { conversationReducer, initialConversationState, type ConversationAction } from './conversation-state';
import {
  restoreWorkspaceTabs,
  serializeWorkspaceTabs,
  workspaceTabsStorageKey,
  dataTab,
  type WorkspaceTab,
} from './workspace-tabs';

type Navigation = { tabs: WorkspaceTab[]; activeId: string; ready: boolean };
type Action =
  | { type: 'snapshot'; snapshot: State; serialized: string | null }
  | { type: 'activate'; tab: WorkspaceTab }
  | { type: 'close'; id: string }
  | { type: 'conversation'; action: ConversationAction; id: string }
  | { type: 'display'; dataOpen: boolean };
const initial: Navigation = { tabs: [], activeId: '', ready: false };
function reducer(state: Navigation, action: Action): Navigation {
  switch (action.type) {
    case 'snapshot': {
      const tabs = (state.ready ? state.tabs : restoreWorkspaceTabs(action.serialized, action.snapshot))
        .filter((tab) => action.snapshot.datasets.some((d) => d.id === tab.datasetId))
        .map((tab) => {
          const valid = new Set(
            action.snapshot.conversations.filter((c) => c.datasetId === tab.datasetId).map((c) => c.id),
          );
          const drafts = Object.fromEntries(
            Object.entries(tab.drafts).filter(([key]) => key === `new:${tab.datasetId}` || valid.has(key)),
          );
          let next = { ...tab, drafts };
          if (tab.conversationId && !valid.has(tab.conversationId))
            next = {
              ...next,
              conversationId: '',
              runId: '',
              observedTask: '',
              question: drafts[`new:${tab.datasetId}`] || '',
            };
          const task = action.snapshot.tasks.find((t) => t.id === next.observedTask);
          return task ? { ...next, ...conversationReducer(next, { type: 'settled', task }) } : next;
        });
      return {
        ready: true,
        tabs,
        activeId: tabs.some((t) => t.open && t.id === state.activeId)
          ? state.activeId
          : tabs.find((t) => t.open)?.id || '',
      };
    }
    case 'activate': {
      const existing = state.tabs.find((tab) => tab.id === action.tab.datasetId);
      const tab = existing
        ? { ...existing, open: true, dataOpen: existing.open ? existing.dataOpen : true }
        : action.tab;
      return {
        ...state,
        tabs: existing ? state.tabs.map((t) => (t.id === tab.id ? tab : t)) : [...state.tabs, tab],
        activeId: tab.id,
      };
    }
    case 'close': {
      const tabs = state.tabs.map((t) => (t.id === action.id ? { ...t, open: false } : t));
      return {
        ...state,
        tabs,
        activeId: state.activeId === action.id ? tabs.find((t) => t.open)?.id || '' : state.activeId,
      };
    }
    case 'display':
      return {
        ...state,
        tabs: state.tabs.map((t) => (t.id === state.activeId ? { ...t, dataOpen: action.dataOpen } : t)),
      };
    case 'conversation': {
      const background = action.action.type === 'submitted';
      const datasetId = ('datasetId' in action.action && action.action.datasetId) || action.id;
      const existing = state.tabs.find((t) => t.id === datasetId);
      const previous = existing || dataTab(datasetId);
      const next = conversationReducer(previous, action.action);
      if (next === previous) return state;
      const tab = { ...previous, ...next, open: background ? previous.open : true };
      return {
        ...state,
        tabs: existing ? state.tabs.map((t) => (t.id === tab.id ? tab : t)) : [...state.tabs, tab],
        activeId: background ? state.activeId : tab.id,
      };
    }
  }
}
export function useWorkspaceNavigation(report: (message: string) => void) {
  const [navigation, dispatch] = useReducer(reducer, initial);
  const persisted = useRef<string | null>(null);
  const initialized = useRef(false);
  const receive = (snapshot: State) => {
    if (!initialized.current) {
      initialized.current = true;
      try {
        persisted.current = localStorage.getItem(workspaceTabsStorageKey);
      } catch {
        report('无法读取会话草稿，请检查本地存储。');
      }
    }
    dispatch({ type: 'snapshot', snapshot, serialized: persisted.current });
  };
  useEffect(() => {
    if (!navigation.ready) return;
    const serialized = serializeWorkspaceTabs(navigation.tabs);
    if (serialized === persisted.current) return;
    try {
      localStorage.setItem(workspaceTabsStorageKey, serialized);
      persisted.current = serialized;
    } catch {
      report('会话草稿未能保存，重启后可能无法恢复。');
    }
  }, [navigation.tabs, navigation.ready, report]);
  const active = navigation.tabs.find((t) => t.id === navigation.activeId);
  return {
    workspaceTabs: navigation.tabs.filter((t) => t.open),
    activeTabId: navigation.activeId,
    conversationState: active || initialConversationState,
    dataOpen: active?.dataOpen || false,
    receive,
    activate: (tab: WorkspaceTab) => dispatch({ type: 'activate', tab }),
    close: (id: string) => dispatch({ type: 'close', id }),
    newConversation: (datasetId: string, question?: string) =>
      dispatch({
        type: 'conversation',
        id: datasetId,
        action: { type: 'navigate', datasetId, question },
      }),
    dispatchConversation: (action: ConversationAction) =>
      dispatch({ type: 'conversation', action, id: navigation.activeId }),
    setDataOpen: (dataOpen: boolean) => dispatch({ type: 'display', dataOpen }),
  };
}
