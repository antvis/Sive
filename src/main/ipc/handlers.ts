import { clipboard, nativeTheme, type BrowserWindow } from 'electron';
import type { API } from '@shared/contracts';
import type { CommandHandlers } from '@shared/commands';
import { themePalette } from '@shared/theme';
import { buildWorkspaceState } from '../services/workspaceState';
import type { WorkbenchServices } from '../services';
import { selectLocalFile } from '../services/data/selectLocalFile';
import { exportAnalysis } from '../services/export/exportAnalysis';

export function createHandlers(
  win: BrowserWindow,
  services: WorkbenchServices,
  root: string,
  getRevision: () => number,
): CommandHandlers {
  return {
    writeClipboard: (text) => clipboard.writeText(text),
    run: (id) => services.records.run(id),
    state: () => ({
      ...buildWorkspaceState(services),
      refreshingSavedId: services.snippets.refreshingId,
      revision: getRevision(),
    }),
    saveTheme: (theme) => {
      services.settings.saveTheme(theme);
      nativeTheme.themeSource = services.settings.theme().mode;
      win.setBackgroundColor(themePalette(services.settings.theme()).background);
    },
    testMySQL: (input) => services.datasets.testMySQL(input),
    saveMySQL: (input) => services.datasets.saveMySQL(input),
    refreshMySQL: (id) => services.datasets.refreshMySQL(id),
    importData: async (format) => {
      const file = await selectLocalFile(win, services.settings, format);
      return file ? services.datasets.import(file) : null;
    },
    renameData: (id, name) => services.datasets.rename(id, name),
    relocateData: (id) => services.datasets.relocate(id, () => selectLocalFile(win, services.settings)),
    createConversation: (datasetId) => services.conversations.create(datasetId),
    deleteData: (id) => services.datasets.deleteData(id),
    deleteConversation: (id) => services.conversations.archive(id),
    restoreConversation: (id) => services.conversations.restore(id),
    purgeConversations: (ids) => services.conversations.purge(ids),
    reparseData: (id) => services.datasets.reparseData(id),
    preview: (id, table, options) => services.datasets.preview(id, table, options),
    tableDetails: (id, table) => services.datasets.tableDetails(id, table),
    semantic: (id, text, metrics) => services.datasets.semantic(id, text, metrics),
    analyze: (...args: Parameters<API['analyze']>) => services.analysis.analyze(...args),
    cancel: (id) => services.analysis.cancel(id),
    removeSavedAnalysis: (id) => services.snippets.remove(id),
    renameSavedAnalysis: (id, title) => services.snippets.rename(id, title),
    refreshSavedAnalysis: (id) => services.snippets.refresh(id),
    chartHTML: (id, theme, saved) => services.snippets.chartHTML(id, theme, saved),
    saveAnalysis: (id) => services.snippets.save(id),
    exportAnalysis: (id, format, saved) =>
      exportAnalysis(win, services.records, services.settings.theme(), root, id, format, saved),
    listModels: (input) => services.models.list(input),
    saveModel: (input) =>
      services.models.save(input, (progress) => {
        if (win && !win.isDestroyed()) win.webContents.send('workbench:model-test', progress);
      }),
    activateModel: (id, model) => services.models.activate(id, model),
    deleteModel: (id) => services.models.delete(id),
  };
}
