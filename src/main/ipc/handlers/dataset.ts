import type { BrowserWindow } from 'electron';
import type { CommandHandlers } from '../commands';
import type { WorkbenchServices } from '../../services';
import { selectLocalFile } from '../../services/data/selectLocalFile';

export function createDatasetHandlers(
  win: BrowserWindow,
  services: Pick<WorkbenchServices, 'datasets' | 'settings'>,
): Pick<
  CommandHandlers,
  | 'datasetTestMySQL'
  | 'datasetSaveMySQL'
  | 'datasetRefreshMySQL'
  | 'datasetImport'
  | 'datasetRename'
  | 'datasetRelocate'
  | 'datasetDelete'
  | 'datasetPreview'
  | 'datasetGetTableDetails'
  | 'datasetSaveSemantic'
> {
  return {
    datasetTestMySQL: (input) => services.datasets.testMySQL(input),
    datasetSaveMySQL: (input) => services.datasets.saveMySQL(input),
    datasetRefreshMySQL: (id) => services.datasets.refreshMySQL(id),
    datasetImport: async (format) => {
      const file = await selectLocalFile(win, services.settings, format);
      return file ? services.datasets.import(file) : null;
    },
    datasetRename: (id, name) => services.datasets.rename(id, name),
    datasetRelocate: (id) => services.datasets.relocate(id, () => selectLocalFile(win, services.settings)),
    datasetDelete: (id) => services.datasets.deleteData(id),
    datasetPreview: (id, table, options) => services.datasets.preview(id, table, options),
    datasetGetTableDetails: (id, table) => services.datasets.tableDetails(id, table),
    datasetSaveSemantic: (id, text, metrics) => services.datasets.semantic(id, text, metrics),
  };
}
