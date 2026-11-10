import { ipcMain, type BrowserWindow } from 'electron';
import { commandNames, invokeCommand, type CommandHandlers } from '@shared/commands';
import { failure, WorkbenchError } from '@shared/errors';
import type { WorkbenchServices } from '../services';
import { createWorkspaceHandlers } from './handlers/workspace';
import { createDatasetHandlers } from './handlers/dataset';
import { createConversationHandlers } from './handlers/conversation';
import { createAnalysisHandlers } from './handlers/analysis';
import { createSnippetHandlers } from './handlers/snippet';
import { createModelHandlers } from './handlers/model';
import { createSettingsHandlers } from './handlers/settings';

export function registerIPC(
  win: BrowserWindow,
  services: WorkbenchServices,
  root: string,
  getRevision: () => number,
  rendererURL: URL,
) {
  const handlers: CommandHandlers = {
    ...createWorkspaceHandlers(services, getRevision),
    ...createDatasetHandlers(win, services),
    ...createConversationHandlers(services.conversations),
    ...createAnalysisHandlers(win, services, root),
    ...createSnippetHandlers(services.snippets),
    ...createModelHandlers(win, services.models),
    ...createSettingsHandlers(win, services.settings),
  };

  for (const name of commandNames) {
    ipcMain.handle('workbench:' + name, async (event, ...args: unknown[]) => {
      try {
        const frame = event.senderFrame;
        const page = frame?.url ? new URL(frame.url) : undefined;
        const allowed =
          page?.protocol === rendererURL.protocol &&
          page.pathname === rendererURL.pathname &&
          (rendererURL.protocol === 'file:'
            ? page.host === rendererURL.host
            : page.origin === rendererURL.origin);
        if (event.sender !== win.webContents || frame !== win.webContents.mainFrame || !allowed)
          throw new WorkbenchError('INVALID_INPUT', '不允许的调用');
        return { ok: true, value: await invokeCommand(handlers, name, args) };
      } catch (error) {
        return failure(error);
      }
    });
  }
}
