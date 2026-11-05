import { useOutletContext } from 'react-router';
import type { Dataset, State } from '../../shared/contracts';
import type { AnalysisMode } from '../../shared/analysis-options';
import type { useWorkspaceNavigation } from './use-workspace-navigation';

export type WorkspaceContext = {
  state: State;
  busy: boolean;
  submitting: boolean;
  analysisMode: AnalysisMode;
  setAnalysisMode: (mode: AnalysisMode) => void;
  setSubmitting: (value: boolean) => void;
  navigation: ReturnType<typeof useWorkspaceNavigation>;
  open: (dataset: Dataset) => void;
  refresh: () => Promise<void>;
  openModelSettings: () => void;
};
export const useWorkspace = () => useOutletContext<WorkspaceContext>();
