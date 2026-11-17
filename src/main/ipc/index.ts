import path from 'node:path';
import { app, BrowserWindow, dialog, ipcMain } from 'electron';
import type { IpcMainInvokeEvent } from 'electron';
import type { DataSourceConfig, Semantic } from '@antv/ava';
import type { SnippetSaveInput, SnippetUpdateInput } from '@shared/snippets';
import type { Services } from '../services';
import type { DatasetPreviewOptions } from '@shared/api';
import type { ModelInput, Preferences } from '../services/types';
import { LOCAL_FILE_FORMATS } from '@shared/api';
import { localSource } from '../util/localFile';
import { checkForUpdates, getStorageInfo, systemOpen } from '../util/system';

export const WORKSPACE_CHANGED_CHANNEL = 'workspace:changed';

function text(value: unknown) {
  if (typeof value !== 'string' || !value.trim()) throw new Error('文本不能为空。');
  return value.trim();
}

function objectInput<T>(value: unknown): T {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('输入参数无效。');
  return value as T;
}

function stringList(value: unknown) {
  if (!Array.isArray(value)) throw new Error('输入参数无效。');
  return value.map(text);
}

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
    const result = await dialog.showOpenDialog(BrowserWindow.fromWebContents(event.sender)!, {
      title: '选择数据文件',
      defaultPath: typeof lastDirectory === 'string' && lastDirectory ? lastDirectory : undefined,
      properties: ['openFile'],
      filters: [
        {
          name: format ? `${format.toUpperCase()} 文件` : '数据文件',
          extensions: format ? [format] : [...LOCAL_FILE_FORMATS],
        },
      ],
    });
    if (result.canceled) return null;
    const filePath = result.filePaths[0];
    if (format && path.extname(filePath).toLowerCase() !== `.${format}`)
      throw new Error(`请选择 ${format.toUpperCase()} 文件。`);
    return {
      name: path.basename(filePath, path.extname(filePath)).trim(),
      sourceConfig: localSource(filePath),
      directory: path.dirname(filePath),
    };
  });

  ipcMain.handle('datasetRefresh', async (event, input) => {
    const id = text(input);
    await services.analysis.beginDatasetUpdate(id);
    try {
      await services.dataset.refresh(id);
    } finally {
      services.analysis.endDatasetUpdate(id);
    }
    changed(event);
  });

  ipcMain.handle('datasetGet', (_event, id) => services.dataset.getDetail(text(id)));

  ipcMain.handle('datasetTest', (_event, sourceConfig) =>
    services.dataset.test(objectInput<DataSourceConfig>(sourceConfig)),
  );

  ipcMain.handle('datasetSave', async (event, name, sourceConfig, inputId) => {
    const id = inputId === undefined ? undefined : text(inputId);
    const datasetName = text(name);
    const source = objectInput<DataSourceConfig>(sourceConfig);
    if (id) await services.analysis.beginDatasetUpdate(id);
    try {
      await services.dataset.save(datasetName, source, id);
    } finally {
      if (id) services.analysis.endDatasetUpdate(id);
    }
    changed(event);
  });

  ipcMain.handle('datasetPreview', (_event, id, table, options) =>
    services.dataset.preview(
      text(id),
      table,
      options === undefined ? undefined : objectInput<DatasetPreviewOptions>(options),
    ),
  );

  ipcMain.handle('datasetSuggest', (_event, id) =>
    services.dataset.suggest(text(id), services.model.getDefaultModelConfig()),
  );

  ipcMain.handle('datasetRename', (event, id, name) => {
    services.dataset.rename(text(id), text(name));
    changed(event);
  });

  ipcMain.handle('datasetDelete', (event, id) => {
    services.dataset.remove(text(id));
    changed(event);
  });

  ipcMain.handle('datasetSaveSemantic', (event, id, semantic, metrics) => {
    services.dataset.saveSemantic(text(id), objectInput<Semantic>(semantic), metrics);
    changed(event);
  });

  ipcMain.handle('conversationRename', (event, id, title) => {
    services.conversation.rename(text(id), text(title));
    changed(event);
  });

  ipcMain.handle('conversationArchive', (event, id) => {
    services.conversation.archive(text(id));
    changed(event);
  });

  ipcMain.handle('conversationRestore', (event, id) => {
    services.conversation.restore(text(id));
    changed(event);
  });

  ipcMain.handle('conversationPurge', (event, ids) => {
    services.conversation.purge(stringList(ids));
    changed(event);
  });

  ipcMain.handle('analysisStart', (event, input) => {
    const request = objectInput<{
      datasetId: string;
      question: string;
      strategy: Preferences['strategy'];
      conversationId?: string;
    }>(input);
    const result = services.analysis.start(
      request,
      services.model.getDefaultModelConfig(),
      services.settings.getPreferences(),
      (progress) => event.sender.send('analysis:task-change', progress),
    );
    changed(event);
    return result;
  });

  ipcMain.handle('analysisCancel', async (event, taskId) => {
    const task = await services.analysis.cancel(text(taskId));
    event.sender.send('analysis:task-change', {
      taskId,
      datasetId: task?.datasetId,
      conversationId: task?.conversationId,
      status: 'cancelled',
      stage: '已取消',
    });
  });

  ipcMain.handle('analysisGetMessages', (_event, conversationId) =>
    services.analysis.getMessages(text(conversationId)),
  );

  ipcMain.handle('snippetSave', (event, input) => {
    const result = services.snippet.save(objectInput<SnippetSaveInput>(input));
    changed(event);
    return result;
  });

  ipcMain.handle('snippetRemove', (event, runId) => {
    services.snippet.remove(text(runId));
    changed(event);
  });

  ipcMain.handle('snippetUpdate', (event, messageId, input) => {
    services.snippet.update(text(messageId), objectInput<SnippetUpdateInput>(input));
    changed(event);
  });

  ipcMain.handle('settingsSavePreferences', (event, preferences) => {
    services.settings.savePreferences(objectInput<Preferences>(preferences));
    changed(event);
  });

  ipcMain.handle('systemGetStorageInfo', () => getStorageInfo());

  ipcMain.handle('systemOpen', (_event, type, path) => systemOpen(type, path));

  ipcMain.handle('aboutGetVersion', () => app.getVersion());

  ipcMain.handle('aboutCheckUpdates', () => checkForUpdates());

  ipcMain.handle('modelListAvailable', (_event, input) => services.model.listAvailable(objectInput(input)));

  ipcMain.handle('modelSave', async (event, input) => {
    const model = objectInput<ModelInput>(input);
    await services.model.test(model, (progress) => event.sender.send('model:test-progress', progress));
    services.model.save(model);
    changed(event);
  });

  ipcMain.handle('modelActivate', (event, id, model) => {
    services.model.activate(text(id), model === undefined ? undefined : text(model));
    changed(event);
  });

  ipcMain.handle('modelDelete', (event, id) => {
    services.model.remove(text(id));
    changed(event);
  });
}
