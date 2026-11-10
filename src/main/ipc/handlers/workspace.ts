import { clipboard } from 'electron';
import type { CommandHandlers } from '../commands';
import type { WorkbenchServices } from '../../services';
import { buildWorkspaceState } from '../../services/workspaceState';

export function createWorkspaceHandlers(
  services: WorkbenchServices,
  getRevision: () => number,
): Pick<CommandHandlers, 'clipboardWrite' | 'workspaceGetState'> {
  return {
    clipboardWrite: (text) => clipboard.writeText(text),
    workspaceGetState: () => ({
      ...buildWorkspaceState(services),
      refreshingSavedId: services.snippets.refreshingId,
      revision: getRevision(),
    }),
  };
}
