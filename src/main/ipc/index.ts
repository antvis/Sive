import path from 'node:path';
import { app, BrowserWindow, dialog, ipcMain } from 'electron';
import type { IpcMainInvokeEvent } from 'electron';
import type { DataSourceConfig, Semantic } from '@antv/ava';
import type { SnippetSaveInput, SnippetUpdateInput } from '@shared/schema';
import type { Services } from '../services';
import type {
  AnalysisStartInput,
  DatasetPreviewOptions,
  LocalFileFormat,
  ModelConnectionInput,
  ModelInput,
  Preferences,
} from '@shared/api';
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

  ipcMain.handle('datasetSelectLocal', async (event, format?: LocalFileFormat, lastDirectory?: string) => {
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

  ipcMain.handle('datasetRefresh', async (event, id: string) => {
    await services.analysis.beginDatasetUpdate(id);
    try {
      await services.dataset.refresh(id);
    } finally {
      services.analysis.endDatasetUpdate(id);
    }
    changed(event);
  });

  ipcMain.handle('datasetGet', (_event, id: string) => services.dataset.getDetail(id));

  ipcMain.handle('datasetTest', (_event, sourceConfig: DataSourceConfig) =>
    services.dataset.test(sourceConfig),
  );

  ipcMain.handle('datasetExtractText', (_event, text: string) =>
    services.dataset.extractText(text, services.model.getDefaultModelConfig()),
  );

  ipcMain.handle('datasetSave', async (event, name: string, sourceConfig: DataSourceConfig, id?: string) => {
    if (id) await services.analysis.beginDatasetUpdate(id);
    try {
      await services.dataset.save(name, sourceConfig, id);
    } finally {
      if (id) services.analysis.endDatasetUpdate(id);
    }
    changed(event);
  });

  ipcMain.handle('datasetPreview', (_event, id: string, table?: string, options?: DatasetPreviewOptions) =>
    services.dataset.preview(id, table, options),
  );

  ipcMain.handle('datasetSuggest', (_event, id: string) =>
    services.dataset.suggest(id, services.model.getDefaultModelConfig()),
  );

  ipcMain.handle('datasetRename', (event, id: string, name: string) => {
    services.dataset.rename(id, name);
    changed(event);
  });

  ipcMain.handle('datasetDelete', (event, id: string) => {
    services.dataset.remove(id);
    changed(event);
  });

  ipcMain.handle('datasetSaveSemantic', (event, id: string, semantic: Semantic) => {
    services.dataset.saveSemantic(id, semantic);
    changed(event);
  });

  ipcMain.handle('conversationRename', (event, id: string, title: string) => {
    services.conversation.rename(id, title);
    changed(event);
  });

  ipcMain.handle('conversationArchive', (event, id: string) => {
    services.conversation.archive(id);
    changed(event);
  });

  ipcMain.handle('conversationRestore', (event, id: string) => {
    services.conversation.restore(id);
    changed(event);
  });

  ipcMain.handle('conversationPurge', (event, ids: string[]) => {
    services.conversation.purge(ids);
    changed(event);
  });

  ipcMain.handle('analysisStart', (event, input: AnalysisStartInput) => {
    const result = services.analysis.start(
      input,
      services.model.getDefaultModelConfig(),
      services.settings.getPreferences(),
      (progress) => event.sender.send('analysis:task-change', progress),
    );
    changed(event);
    return result;
  });

  ipcMain.handle('analysisCancel', async (event, taskId: string) => {
    const task = await services.analysis.cancel(taskId);
    event.sender.send('analysis:task-change', {
      taskId,
      datasetId: task?.datasetId,
      conversationId: task?.conversationId,
      status: 'cancelled',
      stage: '已取消',
    });
  });

  ipcMain.handle('analysisGetMessages', (_event, conversationId: string) =>
    services.analysis.getMessages(conversationId),
  );

  ipcMain.handle('snippetSave', (event, input: SnippetSaveInput) => {
    const result = services.snippet.save(input);
    changed(event);
    return result;
  });

  ipcMain.handle('snippetRemove', (event, messageId: string) => {
    services.snippet.remove(messageId);
    changed(event);
  });

  ipcMain.handle('snippetUpdate', (event, messageId: string, input: SnippetUpdateInput) => {
    services.snippet.update(messageId, input);
    changed(event);
  });

  ipcMain.handle('settingsSavePreferences', (event, preferences: Preferences) => {
    services.settings.savePreferences(preferences);
    changed(event);
  });

  ipcMain.handle('systemGetStorageInfo', () => getStorageInfo());

  ipcMain.handle('systemOpen', (_event, type: 'directory' | 'url', path: string) => systemOpen(type, path));

  ipcMain.handle('aboutGetVersion', () => app.getVersion());

  ipcMain.handle('aboutCheckUpdates', () => checkForUpdates());

  ipcMain.handle('modelListAvailable', (_event, input: ModelConnectionInput) => services.model.listAvailable(input));

  ipcMain.handle('modelSave', async (event, input: ModelInput) => {
    await services.model.test(input, (progress) => event.sender.send('model:test-progress', progress));
    services.model.save(input);
    changed(event);
  });

  ipcMain.handle('modelActivate', (event, id: string, model?: string) => {
    services.model.activate(id, model);
    changed(event);
  });

  ipcMain.handle('modelDelete', (event, id: string) => {
    services.model.remove(id);
    changed(event);
  });
}
