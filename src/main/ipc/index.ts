import { ipcMain } from 'electron';
import type { IpcMainInvokeEvent } from 'electron';
import type { Semantic } from '@antv/ava';
import type { Services } from '../services';
import type { DatasetSaveInput, ModelInput, ThemeSettings } from '../services/types';

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
    datasets: services.dataset.list(),
    runs: services.analysis.listSummaries(),
    models: services.model.list(),
    activeModelId: services.settings.getActiveModel().providerId,
    theme: services.settings.getTheme(),
    revision,
  }));

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

  ipcMain.handle('analysisSave', (event, input) => {
    const result = services.analysis.save(objectInput(input));
    changed(event);
    return result;
  });

  ipcMain.handle('analysisGetRun', (_event, id) => services.analysis.getRun(text(id)));

  ipcMain.handle('snippetSave', (event, runId) => {
    services.snippet.save(text(runId));
    changed(event);
  });

  ipcMain.handle('snippetRemove', (event, runId) => {
    services.snippet.remove(text(runId));
    changed(event);
  });

  ipcMain.handle('snippetRename', (event, runId, title) => {
    services.snippet.rename(text(runId), text(title));
    changed(event);
  });

  ipcMain.handle('settingsSaveTheme', (event, theme) => {
    services.settings.saveTheme(objectInput<ThemeSettings>(theme));
    changed(event);
  });

  ipcMain.handle('modelSave', (event, input) => {
    services.model.save(objectInput<ModelInput>(input));
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
