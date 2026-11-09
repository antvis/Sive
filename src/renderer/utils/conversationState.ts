export type ConversationState = {
  datasetId: string;
  conversationId: string;
  runId: string;
  question: string;
  drafts: Record<string, string>;
};
export const initialConversationState: ConversationState = {
  datasetId: '',
  conversationId: '',
  runId: '',
  question: '',
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
      question?: string;
    }
  | { type: 'edit'; question: string }
  | {
      type: 'submitted';
      originKey: string;
      datasetId: string;
      conversationId: string;
      sentQuestion: string;
    };
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
        question: action.question ?? drafts[draftKey(next)] ?? '',
      };
    }
    case 'edit':
      return { ...state, question: action.question };
    case 'submitted': {
      // An IPC response must not navigate away from a conversation selected while it was pending.
      if (draftKey(state) !== action.originKey)
        return {
          ...state,
          drafts: {
            ...state.drafts,
            [action.originKey]:
              state.drafts[action.originKey] === action.sentQuestion
                ? ''
                : state.drafts[action.originKey] || '',
          },
        };
      return {
        ...state,
        datasetId: action.datasetId,
        conversationId: action.conversationId,
        runId: '',
        drafts: { ...state.drafts, [action.originKey]: '' },
        question: state.question === action.sentQuestion ? '' : state.question,
      };
    }
  }
}
