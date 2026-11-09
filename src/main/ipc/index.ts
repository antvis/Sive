import { ipcMain, type BrowserWindow } from 'electron';
import { commandNames, invokeCommand, type CommandHandlers } from '@shared/commands';
import { failure, WorkbenchError } from '@shared/errors';

export function registerIPC(win: BrowserWindow, methods: CommandHandlers) {
  for (const name of commandNames) {
    ipcMain.handle('workbench:' + name, async (event, ...args: unknown[]) => {
      try {
        if (event.sender !== win.webContents || event.senderFrame !== win.webContents.mainFrame)
          throw new WorkbenchError('INVALID_INPUT', '不允许的调用');
        return { ok: true, value: await invokeCommand(methods, name, args) };
      } catch (error) {
        return failure(error);
      }
    });
  }
}
