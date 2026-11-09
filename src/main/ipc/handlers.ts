import { clipboard, nativeTheme, type BrowserWindow } from 'electron';
import type { API } from '@shared/contracts';
import type { CommandHandlers } from '@shared/commands';
import { WorkbenchError } from '@shared/errors';
import { themePalette } from '@shared/theme';
import type { DataServices } from '@main/data';
import { workspaceState } from '@main/data/services/workspaceState';
import type { WorkbenchServices } from '@main/services';
import type { ModelService } from '@main/services/settings/ModelService';
import { selectLocalFile } from '@main/services/data/selectLocalFile';
import { exportAnalysis } from '@main/services/export/exportAnalysis';

export function createHandlers(
  win: BrowserWindow,
  data: DataServices,
  services: WorkbenchServices,
  models: ModelService,
  root: string,
  getRevision: () => number,
  change: () => void,
): CommandHandlers {
  return {
    writeClipboard: (text) => clipboard.writeText(text),
    run: (id) => data.conversations.run(id),
    state: () => ({
      ...workspaceState(data, services.analysis.task),
      refreshingSavedId: services.snippets.refreshingId,
      revision: getRevision(),
    }),
    saveTheme: (theme) => {
      data.settings.saveTheme(theme);
      nativeTheme.themeSource = data.settings.theme().mode;
      win.setBackgroundColor(themePalette(data.settings.theme()).background);
      change();
    },
    testMySQL: (input) => services.datasets.testMySQL(input),
    saveMySQL: (input) => services.datasets.saveMySQL(input),
    refreshMySQL: (id) => services.datasets.refreshMySQL(id),
    importData: async (format) => {
      const file = await selectLocalFile(win, data.settings, format);
      return file ? services.datasets.import(file) : null;
    },
    renameData: (id, name) => services.datasets.rename(id, name),
    relocateData: async (id) => {
      if (data.datasets.dataset(id).format === 'mysql')
        throw new WorkbenchError('INVALID_INPUT', '请选择本地文件连接');
      const file = await selectLocalFile(win, data.settings);
      if (!file) return false;
      await services.datasets.relocate(id, file);
      return true;
    },
    createConversation: (datasetId) => {
      const conversation = data.conversations.createConversation(datasetId);
      change();
      return conversation;
    },
    deleteData: (id) => services.datasets.deleteData(id),
    deleteConversation: (id) => {
      const refreshing = services.snippets.refreshingId;
      if (refreshing && data.conversations.run(refreshing).conversationId === id)
        throw new WorkbenchError('CONFLICT', '请等待此会话的收藏刷新完成');
      data.conversations.deleteConversation(id);
      if (services.analysis.task?.conversationId === id) services.analysis.task = null;
      change();
    },
    restoreConversation: (id) => {
      data.conversations.restoreConversation(id);
      change();
    },
    purgeConversations: (ids) => {
      const refreshing = services.snippets.refreshingId;
      if (refreshing && ids.includes(data.conversations.run(refreshing).conversationId))
        throw new WorkbenchError('CONFLICT', '请等待此会话的收藏刷新完成');
      data.conversations.purgeConversations(ids);
      change();
    },
    reparseData: (id) => services.datasets.reparseData(id),
    preview: (id, table, options) => services.datasets.preview(id, table, options),
    tableDetails: (id, table) => services.datasets.tableDetails(id, table),
    semantic: (id, text, metrics) => services.datasets.semantic(id, text, metrics),
    analyze: (...args: Parameters<API['analyze']>) => services.analysis.analyze(...args),
    cancel: () => services.analysis.cancel(),
    removeSavedAnalysis: (id) => services.snippets.remove(id),
    renameSavedAnalysis: (id, title) => services.snippets.rename(id, title),
    refreshSavedAnalysis: (id) => services.snippets.refresh(id),
    chartHTML: (id, theme, saved) => services.snippets.chartHTML(id, theme, saved),
    saveAnalysis: (id) => {
      data.conversations.saveAnalysis(id);
      change();
    },
    exportAnalysis: (id, format, saved) =>
      exportAnalysis(win, data.conversations, data.settings.theme(), root, id, format, saved),
    listModels: (input) => models.list(input),
    saveModel: async (input) => {
      await models.save(input, (progress) => {
        if (win && !win.isDestroyed()) win.webContents.send('workbench:model-test', progress);
      });
      change();
    },
    activateModel: (id, model) => {
      models.activate(id, model);
      change();
    },
    deleteModel: (id) => {
      models.delete(id);
      change();
    },
  };
}
