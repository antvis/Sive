import type { BrowserWindow } from 'electron';
import type { CommandHandlers } from '../commands';
import type { WorkbenchServices } from '../../services';

export function createModelHandlers(
  win: BrowserWindow,
  models: WorkbenchServices['models'],
): Pick<CommandHandlers, 'modelListAvailable' | 'modelSave' | 'modelActivate' | 'modelDelete'> {
  return {
    modelListAvailable: (input) => models.list(input),
    modelSave: (input) =>
      models.save(input, (progress) => {
        if (!win.isDestroyed()) win.webContents.send('workbench:model-test', progress);
      }),
    modelActivate: (id, model) => models.activate(id, model),
    modelDelete: (id) => models.delete(id),
  };
}
