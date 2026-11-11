import { clipboard, nativeTheme, type BrowserWindow } from 'electron';
import type { CommandHandlers } from './commands';
import type { WorkbenchServices } from '../services';
import { themePalette } from '@shared/theme';
import { selectLocalFile } from '../services/data/selectLocalFile';
import { exportAnalysis } from '../services/export/exportAnalysis';
import { buildWorkspaceState } from '../services/workspaceState';
import { SUGGEST_TIMEOUT_MS } from '../config';

export function createCommandHandlers(
  win: BrowserWindow,
  services: WorkbenchServices,
  root: string,
  getRevision: () => number,
): CommandHandlers {
  const { datasets, settings, conversations, records, analysis, snippets, models } = services;
  const suggestions = new Map<string, AbortController>();
  win.webContents.once('destroyed', () => {
    for (const controller of suggestions.values()) controller.abort();
    suggestions.clear();
  });
  return {
    clipboardWrite: (text) => clipboard.writeText(text),
    workspaceGetState: () => ({
      ...buildWorkspaceState(services),
      refreshingSavedId: snippets.refreshingId,
      revision: getRevision(),
    }),

    datasetTestMySQL: (input) => datasets.testMySQL(input),
    datasetSaveMySQL: (input) => datasets.saveMySQL(input),
    datasetRefreshMySQL: (id) => datasets.refreshMySQL(id),
    datasetImport: async (format) => {
      const file = await selectLocalFile(win, settings, format);
      return file ? datasets.import(file) : null;
    },
    datasetRename: (id, name) => datasets.rename(id, name),
    datasetRelocate: (id) => datasets.relocate(id, () => selectLocalFile(win, settings)),
    datasetDelete: (id) => datasets.deleteData(id),
    datasetPreview: (id, table, options) => datasets.preview(id, table, options),
    datasetGetTableDetails: (id, table) => datasets.tableDetails(id, table),
    datasetSuggest: async (id, requestId) => {
      suggestions.get(requestId)?.abort();
      const controller = new AbortController();
      const signal = AbortSignal.any([controller.signal, AbortSignal.timeout(SUGGEST_TIMEOUT_MS)]);
      suggestions.set(requestId, controller);
      try {
        return await datasets.suggest(id, models.model(models.active(), signal), signal);
      } finally {
        if (suggestions.get(requestId) === controller) suggestions.delete(requestId);
      }
    },
    datasetCancelSuggestions: (requestId) => suggestions.get(requestId)?.abort(),
    datasetSaveSemantic: (id, text, metrics) => datasets.semantic(id, text, metrics),

    conversationCreate: (datasetId) => conversations.create(datasetId),
    conversationRename: (id, title) => conversations.rename(id, title),
    conversationArchive: (id) => conversations.archive(id),
    conversationRestore: (id) => conversations.restore(id),
    conversationPurge: (ids) => conversations.purge(ids),

    analysisGetRun: (id) => records.run(id),
    analysisStart: (...args) => analysis.analyze(...args),
    analysisCancel: (taskId) => analysis.cancel(taskId),
    analysisGetChartHTML: (id, theme, saved, index) => snippets.chartHTML(id, theme, saved, index),
    analysisExport: (id, format, saved) =>
      exportAnalysis(win, records, settings.theme(), root, id, format, saved),

    snippetSave: (id) => snippets.save(id),
    snippetRemove: (id) => snippets.remove(id),
    snippetRename: (id, title) => snippets.rename(id, title),
    snippetRefresh: (id) => snippets.refresh(id),

    modelListAvailable: (input) => models.list(input),
    modelSave: (input) =>
      models.save(input, (progress) => {
        if (!win.isDestroyed()) win.webContents.send('workbench:model-test', progress);
      }),
    modelActivate: (id, model) => models.activate(id, model),
    modelDelete: (id) => models.delete(id),

    settingsSaveTheme: (theme) => {
      settings.saveTheme(theme);
      nativeTheme.themeSource = settings.theme().mode;
      win.setBackgroundColor(themePalette(settings.theme()).background);
    },
  };
}
