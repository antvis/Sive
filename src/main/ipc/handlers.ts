import { clipboard, nativeTheme, type BrowserWindow } from 'electron';
import type { API } from '@shared/contracts';
import type { CommandHandlers } from '@shared/commands';
import { WorkbenchError } from '@shared/errors';
import { themePalette } from '@shared/theme';
import type { DataServices } from '@main/data';
import { workspaceState } from '@main/data/services/workspaceState';
import type { WorkbenchService } from '@main/services/WorkbenchService';
import type { ModelService } from '@main/services/settings/ModelService';
import { selectLocalFile } from '@main/services/data/selectLocalFile';
import { exportAnalysis } from '@main/services/export/exportAnalysis';

export function createHandlers(
  win: BrowserWindow,
  data: DataServices,
  controller: WorkbenchService,
  models: ModelService,
  root: string,
  getRevision: () => number,
): CommandHandlers {
  return {
    writeClipboard: (text) => clipboard.writeText(text),
    run: (id) => data.conversations.run(id),
    state: () => ({
      ...workspaceState(data, controller.analysis.task),
      refreshingSavedId: controller.snippets.refreshingId,
      revision: getRevision(),
    }),
    saveTheme: (theme) => {
      data.settings.saveTheme(theme);
      nativeTheme.themeSource = data.settings.theme().mode;
      win.setBackgroundColor(themePalette(data.settings.theme()).background);
      controller.change();
    },
    testMySQL: (input) => controller.datasets.testMySQL(input),
    saveMySQL: (input) => controller.datasets.saveMySQL(input),
    refreshMySQL: (id) => controller.datasets.refreshMySQL(id),
    importData: async (format) => {
      const file = await selectLocalFile(win, data.settings, format);
      return file ? controller.datasets.import(file) : null;
    },
    renameData: (id, name) => controller.datasets.rename(id, name),
    relocateData: async (id) => {
      if (data.datasets.dataset(id).format === 'mysql')
        throw new WorkbenchError('INVALID_INPUT', '请选择本地文件连接');
      const file = await selectLocalFile(win, data.settings);
      if (!file) return false;
      await controller.datasets.relocate(id, file);
      return true;
    },
    createConversation: (datasetId) => {
      const conversation = data.conversations.createConversation(datasetId);
      controller.change();
      return conversation;
    },
    deleteData: (id) => controller.datasets.deleteData(id),
    deleteConversation: (id) => {
      const refreshing = controller.snippets.refreshingId;
      if (refreshing && data.conversations.run(refreshing).conversationId === id)
        throw new WorkbenchError('CONFLICT', '请等待此会话的收藏刷新完成');
      data.conversations.deleteConversation(id);
      if (controller.analysis.task?.conversationId === id) controller.analysis.task = null;
      controller.change();
    },
    restoreConversation: (id) => {
      data.conversations.restoreConversation(id);
      controller.change();
    },
    purgeConversations: (ids) => {
      const refreshing = controller.snippets.refreshingId;
      if (refreshing && ids.includes(data.conversations.run(refreshing).conversationId))
        throw new WorkbenchError('CONFLICT', '请等待此会话的收藏刷新完成');
      data.conversations.purgeConversations(ids);
      controller.change();
    },
    reparseData: (id) => controller.datasets.reparseData(id),
    preview: (id, table, options) => controller.datasets.preview(id, table, options),
    tableDetails: (id, table) => controller.datasets.tableDetails(id, table),
    semantic: (id, text, metrics) => controller.datasets.semantic(id, text, metrics),
    analyze: (...args: Parameters<API['analyze']>) => controller.analysis.analyze(...args),
    cancel: () => controller.analysis.cancel(),
    removeSavedAnalysis: (id) => controller.snippets.remove(id),
    renameSavedAnalysis: (id, title) => controller.snippets.rename(id, title),
    refreshSavedAnalysis: (id) => controller.snippets.refresh(id),
    chartHTML: (id, theme, saved) => controller.snippets.chartHTML(id, theme, saved),
    saveAnalysis: (id) => {
      data.conversations.saveAnalysis(id);
      controller.change();
    },
    exportAnalysis: (id, format, saved) =>
      exportAnalysis(win, data.conversations, data.settings.theme(), root, id, format, saved),
    listModels: (input) => models.list(input),
    saveModel: async (input) => {
      await models.save(input, (progress) => {
        if (win && !win.isDestroyed()) win.webContents.send('workbench:model-test', progress);
      });
      controller.change();
    },
    activateModel: (id, model) => {
      models.activate(id, model);
      controller.change();
    },
    deleteModel: (id) => {
      models.delete(id);
      controller.change();
    },
  };
}
