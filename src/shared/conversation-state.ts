import type { Task } from '../../shared/contracts';

export type ConversationState = {
  datasetId: string;
  conversationId: string;
  runId: string;
  historyTask: Task | null;
  question: string;
  observedTask: string;
  drafts: Record<string, string>;
};
export const initialConversationState: ConversationState = {
  datasetId: '',
  conversationId: '',
  runId: '',
  historyTask: null,
  question: '',
  observedTask: '',
  drafts: {},
};
export const draftKey = (state: Pick<ConversationState, 'conversationId' | 'datasetId'>) =>
  state.conversationId || `new:${state.datasetId}`;
export type ConversationAction =
  | {
      type: 'navigate';
      datasetId: string;
      conversationId?: string;
      runId?: string;
      historyTask?: Task;
      initialQuestion: string;
      question?: string;
      observedTask?: string;
    }
  | { type: 'edit'; question: string; datasetId?: string; clearHistory?: boolean }
  | {
      type: 'submitted';
      originKey: string;
      datasetId: string;
      conversationId: string;
      taskId: string;
      sentQuestion: string;
      emptyQuestion: string;
    }
  | { type: 'settled'; task: Task }
  | { type: 'clear-history' };
export function conversationReducer(state: ConversationState, action: ConversationAction): ConversationState {
  switch (action.type) {
    case 'navigate': {
      const drafts = { ...state.drafts, [draftKey(state)]: state.question };
      const next = { datasetId: action.datasetId, conversationId: action.conversationId || '' };
      return {
        ...state,
        ...next,
        drafts,
        runId: action.runId || '',
        historyTask: action.historyTask || null,
        question: action.question ?? drafts[draftKey(next)] ?? action.initialQuestion,
        observedTask: action.observedTask || '',
      };
    }
    case 'edit':
      if (action.datasetId && action.datasetId !== state.datasetId)
        return {
          ...state,
          drafts: { ...state.drafts, [draftKey(state)]: state.question },
          datasetId: action.datasetId,
          conversationId: '',
          runId: '',
          historyTask: null,
          question: action.question,
          observedTask: '',
        };
      return {
        ...state,
        question: action.question,
        historyTask: action.clearHistory ? null : state.historyTask,
      };
    case 'submitted': {
      // An IPC response must not navigate away from a conversation selected while it was pending.
      if (draftKey(state) !== action.originKey) return state;
      return {
        ...state,
        datasetId: action.datasetId,
        conversationId: action.conversationId,
        runId: '',
        historyTask: null,
        observedTask: action.taskId,
        question: state.question === action.sentQuestion ? action.emptyQuestion : state.question,
      };
    }
    case 'settled':
      if (action.task.id !== state.observedTask || action.task.status !== 'done') return state;
      return {
        ...state,
        observedTask: '',
        runId:
          action.task.conversationId === state.conversationId && action.task.datasetId === state.datasetId
            ? action.task.runId || state.runId
            : state.runId,
      };
    case 'clear-history':
      return { ...state, historyTask: null };
  }
}
