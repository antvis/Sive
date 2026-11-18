import path from 'node:path';
import { app, BrowserWindow, dialog, ipcMain } from 'electron';
import type { IpcMainInvokeEvent } from 'electron';
import type { Services } from '../services';
import { LOCAL_FILE_FORMATS } from '@shared/api';
import { localSource } from '../util/localFile';
import { checkForUpdates, getStorageInfo, systemOpen } from '../util/system';

export const WORKSPACE_CHANGED_CHANNEL = 'workspace:changed';

export function registerIpc(services: Services) {
  let revision = 0;

  const changed = (event: IpcMainInvokeEvent) => {
    revision += 1;
    event.sender.send(WORKSPACE_CHANGED_CHANNEL);
  };

  ipcMain.handle('workspaceGetState', () => {
    const preferences = services.settings.getPreferences();
    return {
      conversations: services.conversation.list(),
      archivedConversations: services.conversation.listArchived(),
      datasets: services.dataset.listSummaries(),
      snippets: services.snippet.list(),
      models: services.model.list(),
      activeModelId: services.settings.getActiveModel().providerId,
      preferences,
      revision,
    };
  });

  ipcMain.handle('datasetSelectLocal', async (event, format, lastDirectory) => {
    if (format !== undefined && !LOCAL_FILE_FORMATS.includes(format)) throw new Error('不支持的文件格式。');
    const extensions = (format ? [format] : LOCAL_FILE_FORMATS).flatMap((format) =>
      format === 'sqlite' ? ['sqlite', 'sqlite3', 'db'] : [format],
    );
    const result = await dialog.showOpenDialog(BrowserWindow.fromWebContents(event.sender)!, {
      title: '选择数据文件',
      defaultPath: typeof lastDirectory === 'string' && lastDirectory ? lastDirectory : undefined,
      properties: ['openFile'],
      filters: [
        {
          name: format ? `${format.toUpperCase()} 文件` : '数据文件',
          extensions,
        },
      ],
    });
    if (result.canceled) return null;
    const filePath = result.filePaths[0];
    if (format && !extensions.includes(path.extname(filePath).slice(1).toLowerCase()))
      throw new Error(`请选择 ${format.toUpperCase()} 文件。`);
    return {
      name: path.basename(filePath, path.extname(filePath)).trim(),
      sourceConfig: localSource(filePath),
      directory: path.dirname(filePath),
    };
  });

  ipcMain.handle('datasetRefresh', async (event, id) => {
    await services.analysis.beginDatasetUpdate(id);
    try {
      await services.dataset.refresh(id);
    } finally {
      services.analysis.endDatasetUpdate(id);
    }
    changed(event);
  });

  ipcMain.handle('datasetGet', (_event, id) => services.dataset.getDetail(id));

  ipcMain.handle('datasetTest', (_event, sourceConfig) =>
    services.dataset.test(sourceConfig),
  );

  ipcMain.handle('datasetExtractText', (_event, input) =>
    services.dataset.extractText(input, services.model.getDefaultModelConfig()),
  );

  ipcMain.handle('datasetSave', async (event, name, sourceConfig, id) => {
    if (id) await services.analysis.beginDatasetUpdate(id);
    try {
      await services.dataset.save(name, sourceConfig, id);
    } finally {
      if (id) services.analysis.endDatasetUpdate(id);
    }
    changed(event);
  });

  ipcMain.handle('datasetPreview', (_event, id, table, options) =>
    services.dataset.preview(id, table, options),
  );

  ipcMain.handle('datasetSuggest', (_event, id) =>
    services.dataset.suggest(id, services.model.getDefaultModelConfig()),
  );

  ipcMain.handle('datasetRename', (event, id, name) => {
    services.dataset.rename(id, name);
    changed(event);
  });

  ipcMain.handle('datasetDelete', (event, id) => {
    services.dataset.remove(id);
    changed(event);
  });

  ipcMain.handle('datasetSaveSemantic', (event, id, semantic, metrics) => {
    services.dataset.saveSemantic(id, semantic, metrics);
    changed(event);
  });

  ipcMain.handle('conversationRename', (event, id, title) => {
    services.conversation.rename(id, title);
    changed(event);
  });

  ipcMain.handle('conversationArchive', (event, id) => {
    services.conversation.archive(id);
    changed(event);
  });

  ipcMain.handle('conversationRestore', (event, id) => {
    services.conversation.restore(id);
    changed(event);
  });

  ipcMain.handle('conversationPurge', (event, ids) => {
    services.conversation.purge(ids);
    changed(event);
  });

  ipcMain.handle('analysisStart', (event, input) => {
    const result = services.analysis.start(
      input,
      services.model.getDefaultModelConfig(),
      services.settings.getPreferences(),
      (progress) => event.sender.send('analysis:task-change', progress),
    );
    changed(event);
    return result;
  });

  ipcMain.handle('analysisCancel', async (event, taskId) => {
    const task = await services.analysis.cancel(taskId);
    event.sender.send('analysis:task-change', {
      taskId,
      datasetId: task?.datasetId,
      conversationId: task?.conversationId,
      status: 'cancelled',
      stage: '已取消',
    });
  });

  ipcMain.handle('analysisGetMessages', (_event, conversationId) =>
    services.analysis.getMessages(conversationId),
  );

  ipcMain.handle('snippetSave', (event, input) => {
    const result = services.snippet.save(input);
    changed(event);
    return result;
  });

  ipcMain.handle('snippetRemove', (event, runId) => {
    services.snippet.remove(runId);
    changed(event);
  });

  ipcMain.handle('snippetUpdate', (event, messageId, input) => {
    services.snippet.update(messageId, input);
    changed(event);
  });

  ipcMain.handle('settingsSavePreferences', (event, preferences) => {
    services.settings.savePreferences(preferences);
    changed(event);
  });

  ipcMain.handle('systemGetStorageInfo', () => getStorageInfo());

  ipcMain.handle('systemOpen', (_event, type, path) => systemOpen(type, path));

  ipcMain.handle('aboutGetVersion', () => app.getVersion());

  ipcMain.handle('aboutCheckUpdates', () => checkForUpdates());

  ipcMain.handle('modelListAvailable', (_event, input) => services.model.listAvailable(input));

  ipcMain.handle('modelSave', async (event, input) => {
    await services.model.test(input, (progress) => event.sender.send('model:test-progress', progress));
    services.model.save(input);
    changed(event);
  });

  ipcMain.handle('modelActivate', (event, id, model) => {
    services.model.activate(id, model);
    changed(event);
  });

  ipcMain.handle('modelDelete', (event, id) => {
    services.model.remove(id);
    changed(event);
  });
}
