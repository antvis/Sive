import { useEffect, useReducer, useRef } from 'react';
import type { State } from '../../shared/contracts';
import {
  conversationReducer,
  initialConversationState,
  type ConversationAction,
  type ConversationState,
} from './conversation-state';
import {
  restoreWorkspaceTabs,
  serializeWorkspaceTabs,
  workspaceTabsStorageKey,
  dataTab,
  hasConversationContent,
  type WorkspaceTab,
} from './workspace-tabs';
import { questionText, withDataReference } from './data-references';

type Tab = WorkspaceTab & ConversationState;
type Navigation = { tabs: Tab[]; activeId: string; ready: boolean };
type Action =
  | { type: 'snapshot'; snapshot: State; serialized: string | null }
  | { type: 'activate'; tab: WorkspaceTab; question: string; activate: boolean }
  | { type: 'close'; id: string }
  | { type: 'draft'; datasetId: string; question: string; snapshot: State }
  | { type: 'conversation'; action: ConversationAction; id: string }
  | { type: 'display'; chat?: boolean; full?: boolean };
const initial: Navigation = { tabs: [], activeId: '', ready: false };
function reducer(state: Navigation, action: Action): Navigation {
  switch (action.type) {
    case 'draft': {
      const empty = (tab: Tab) =>
        !tab.observedTask &&
        !tab.runId &&
        !hasConversationContent(
          action.snapshot,
          tab.conversationId,
          questionText(tab.question, action.snapshot.datasets),
          tab.historyTask,
        );
      const existing =
        state.tabs.find((tab) => tab.id === state.activeId && empty(tab)) ||
        state.tabs.find((tab) => tab.chat && empty(tab));
      const tab = {
        ...initialConversationState,
        ...dataTab(action.datasetId),
        ...(existing ? { id: existing.id } : {}),
        question: action.question,
        chat: true,
      };
      return {
        ...state,
        tabs: [
          ...state.tabs.filter((entry) => entry.id !== existing?.id && !(entry.chat && empty(entry))),
          tab,
        ],
        activeId: tab.id,
      };
    }
    case 'snapshot': {
      const tabs = state.ready
        ? state.tabs
        : restoreWorkspaceTabs(action.serialized, action.snapshot).map((tab) => ({
            ...initialConversationState,
            ...tab,
            question: withDataReference(
              '',
              action.snapshot.datasets.find((d) => d.id === tab.datasetId)!,
              action.snapshot.datasets,
            ),
          }));
      const remaining = tabs.filter(
        (tab) =>
          action.snapshot.datasets.some((d) => d.id === tab.datasetId) &&
          (!tab.conversationId || action.snapshot.conversations.some((c) => c.id === tab.conversationId)),
      );
      return {
        ready: true,
        tabs: remaining.map((tab) =>
          action.snapshot.task
            ? { ...tab, ...conversationReducer(tab, { type: 'settled', task: action.snapshot.task }) }
            : tab,
        ),
        activeId: remaining.some((tab) => tab.id === state.activeId) ? state.activeId : '',
      };
    }
    case 'activate': {
      const existing = state.tabs.find((tab) => tab.id === action.tab.id);
      const tab = existing || { ...initialConversationState, ...action.tab, question: action.question };
      return {
        ...state,
        tabs: existing ? state.tabs : [...state.tabs, tab],
        activeId: action.activate ? tab.id : state.activeId,
      };
    }
    case 'close': {
      const index = state.tabs.findIndex((tab) => tab.id === action.id);
      const tabs = state.tabs.filter((tab) => tab.id !== action.id);
      return {
        ...state,
        tabs,
        activeId:
          state.activeId === action.id ? tabs[Math.min(index, tabs.length - 1)]?.id || '' : state.activeId,
      };
    }
    case 'display':
      return {
        ...state,
        tabs: state.tabs.map((tab) =>
          tab.id === state.activeId
            ? {
                ...tab,
                chat: action.chat ?? tab.chat,
                full: action.chat === false ? false : (action.full ?? tab.full),
              }
            : tab,
        ),
      };
    case 'conversation': {
      const background = action.action.type === 'submitted';
      const targetId = background ? action.id : state.activeId;
      const existing = state.tabs.find((tab) => tab.id === targetId);
      if (background && !existing) return state;
      const previous: Tab = existing || {
        ...initialConversationState,
        id: action.id,
        chat: false,
        full: false,
      };
      const next = conversationReducer(previous, action.action);
      if (next === previous || !next.datasetId) return state;
      const tab = { ...previous, ...next };
      return {
        ...state,
        activeId: background ? state.activeId : tab.id,
        tabs: existing
          ? state.tabs.map((entry) => (entry.id === tab.id ? tab : entry))
          : [...state.tabs, tab],
      };
    }
  }
}

// The active conversation is a projection of its tab, never a second state copy.
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
        report('无法读取工作标签记录，请检查本地存储。');
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
      report('工作标签状态未能保存，重启后可能无法恢复。');
    }
  }, [navigation.tabs, navigation.ready, report]);
  const active = navigation.tabs.find((tab) => tab.id === navigation.activeId);
  return {
    workspaceTabs: navigation.tabs,
    activeTabId: navigation.activeId,
    conversationState: active || initialConversationState,
    chat: active?.chat || false,
    full: active?.full || false,
    receive,
    activate: (tab: WorkspaceTab, question: string, activate = true) =>
      dispatch({ type: 'activate', tab, question, activate }),
    close: (id: string) => dispatch({ type: 'close', id }),
    newConversation: (datasetId: string, question: string, snapshot: State) =>
      dispatch({ type: 'draft', datasetId, question, snapshot }),
    dispatchConversation: (action: ConversationAction) =>
      dispatch({ type: 'conversation', action, id: navigation.activeId || crypto.randomUUID() }),
    setChat: (chat: boolean) => dispatch({ type: 'display', chat }),
    setFull: (full: boolean) => dispatch({ type: 'display', full }),
  };
}
