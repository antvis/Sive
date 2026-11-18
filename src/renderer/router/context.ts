import { useOutletContext } from 'react-router';
import type { WorkspaceState } from '../types';

export type WorkspaceRouteContext = {
  state: WorkspaceState;
  refresh: () => Promise<void>;
  openDataset: (id: string) => void;
  closeDataset: (id: string) => void;
};

export function useWorkspaceRouteContext() {
  return useOutletContext<WorkspaceRouteContext>();
}
