import { useOutletContext } from 'react-router';
import type { Dataset, State, AnalysisMode } from '@shared/contracts';
import type { useWorkspaceNavigation } from '@renderer/hooks/useWorkspaceNavigation';
import type { useChat } from '@ai-sdk/react';
import type { AnalysisChat } from '../data/analysisChat';
import type { AnalysisMessage } from '../data/analysisChat/messages';

export type WorkspaceContext = {
  state: State;
  session: AnalysisChat;
  chat: ReturnType<typeof useChat<AnalysisMessage>>;
  busy: boolean;
  submitting: boolean;
  analysisMode: AnalysisMode;
  setAnalysisMode: (mode: AnalysisMode) => void;
  navigation: ReturnType<typeof useWorkspaceNavigation>;
  open: (dataset: Dataset) => void;
  refresh: () => Promise<void>;
  openModelSettings: () => void;
};
export const useWorkspace = () => useOutletContext<WorkspaceContext>();
