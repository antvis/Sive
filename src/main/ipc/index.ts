import path from 'node:path';
import { BrowserWindow, dialog, ipcMain } from 'electron';
import type { IpcMainInvokeEvent } from 'electron';
import type { Semantic } from '@antv/ava';
import type { SnippetSaveInput, SnippetUpdateInput } from '@shared/snippets';
import type { Services } from '../services';
import type { DatasetPreviewOptions } from '@shared/api';
import type { DatasetSaveInput, ModelInput, Preferences, ThemeSettings } from '../services/types';

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

  ipcMain.handle('workspaceGetState', () => ({
    conversations: services.conversation.list(),
    archivedConversations: services.conversation.listArchived(),
    datasets: services.dataset.listSummaries(),
    snippets: services.snippet.list(),
    models: services.model.list(),
    activeModelId: services.settings.getActiveModel().providerId,
    theme: services.settings.getTheme(),
    preferences: services.settings.getPreferences(),
    revision,
  }));

  ipcMain.handle('datasetImportCsv', async (event, lastDirectory) => {
    const window = BrowserWindow.fromWebContents(event.sender);
    const options = {
      title: '选择 CSV 文件',
      defaultPath: typeof lastDirectory === 'string' && lastDirectory ? lastDirectory : undefined,
      properties: ['openFile' as const],
      filters: [{ name: 'CSV 文件', extensions: ['csv'] }],
    };
    const result = window
      ? await dialog.showOpenDialog(window, options)
      : await dialog.showOpenDialog(options);
    const filePath = result.filePaths[0];
    if (result.canceled || !filePath) return null;
    if (!filePath.toLowerCase().endsWith('.csv')) throw new Error('请选择 CSV 文件。');
    const dataset = await services.dataset.importCsv(filePath);
    const summary = services.dataset.getSummary(dataset.id);
    changed(event);
    return summary ? { ...summary, directory: path.dirname(filePath) } : null;
  });

  ipcMain.handle('datasetGet', (_event, id) => services.dataset.getDetail(text(id)));

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

  ipcMain.handle('datasetSave', (event, input) => {
    const result = services.dataset.save(objectInput<DatasetSaveInput>(input));
    changed(event);
    return result;
  });

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

  ipcMain.handle('conversationCreate', (event, datasetId) => {
    const result = services.conversation.create(text(datasetId));
    changed(event);
    return result;
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
      strategy: 'direct' | 'loop';
      conversationId?: string;
    }>(input);
    const result = services.analysis.start(request, services.model.getDefaultModelConfig(), (progress) =>
      event.sender.send('analysis:task-change', progress),
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

  ipcMain.handle('analysisGetRun', (_event, id) => services.analysis.getRun(text(id)));

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

  ipcMain.handle('settingsSaveTheme', (event, theme) => {
    services.settings.saveTheme(objectInput<ThemeSettings>(theme));
    changed(event);
  });

  ipcMain.handle('settingsSavePreferences', (event, preferences) => {
    services.settings.savePreferences(objectInput<Preferences>(preferences));
    changed(event);
  });

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
