import path from 'node:path';
import { app, BrowserWindow, dialog, ipcMain } from 'electron';
import type { DataSourceConfig, Semantic } from '@antv/ava';
import type { SnippetSaveInput, SnippetUpdateInput } from '@shared/schema';
import type { Services } from '../services';
import type {
  AnalysisStartInput,
  DatasetPreviewOptions,
  ModelConnectionInput,
  ModelInput,
  Preferences,
} from '@shared/api';
import { FILE_SOURCES } from '@shared/dataSource';
import type { LocalFileFormat } from '@shared/dataSource';
import { localSource } from '../util/localFile';
import { checkForUpdates, getStorageInfo, systemOpen } from '../util/system';

export const WORKSPACE_CHANGED_CHANNEL = 'workspace:changed';

export function registerIpc(services: Services, getMainWindow: () => BrowserWindow | undefined) {
  let revision = 0;

  const notifyRenderer = (channel: string, payload?: unknown) => {
    const window = getMainWindow();
    if (window && !window.isDestroyed() && !window.webContents.isDestroyed()) {
      window.webContents.send(channel, payload);
    }
  };

  const changed = () => {
    revision += 1;
    notifyRenderer(WORKSPACE_CHANGED_CHANNEL);
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
    const source = FILE_SOURCES.find((source) => source.action.format === format);
    if (format !== undefined && !source) throw new Error('不支持的文件格式。');
    const formatName = source?.label;
    const extensions = (source ? [source] : FILE_SOURCES).flatMap<string>(
      (source) => source.action.extensions,
    );
    const result = await dialog.showOpenDialog(BrowserWindow.fromWebContents(event.sender)!, {
      title: '选择数据文件',
      defaultPath: typeof lastDirectory === 'string' && lastDirectory ? lastDirectory : undefined,
      properties: ['openFile'],
      filters: [
        {
          name: formatName ? `${formatName} 文件` : '数据文件',
          extensions,
        },
      ],
    });
    if (result.canceled) return null;
    const filePath = result.filePaths[0];
    if (format && !extensions.includes(path.extname(filePath).slice(1).toLowerCase()))
      throw new Error(`请选择 ${formatName} 文件。`);
    return {
      name: path.basename(filePath, path.extname(filePath)).trim(),
      sourceConfig: localSource(filePath),
      directory: path.dirname(filePath),
    };
  });

  ipcMain.handle('datasetRefresh', async (_event, id: string) => {
    await services.analysis.beginDatasetUpdate(id);
    try {
      await services.dataset.refresh(id);
    } finally {
      services.analysis.endDatasetUpdate(id);
    }
    changed();
  });

  ipcMain.handle('datasetGet', (_event, id: string) => services.dataset.getDetail(id));

  ipcMain.handle('datasetTest', (_event, sourceConfig: DataSourceConfig) =>
    services.dataset.test(sourceConfig),
  );

  ipcMain.handle('datasetExtractText', (_event, text: string) =>
    services.dataset.extractText(text, services.model.getDefaultModelConfig()),
  );

  ipcMain.handle('datasetSave', async (_event, name: string, sourceConfig: DataSourceConfig, id?: string) => {
    if (id) await services.analysis.beginDatasetUpdate(id);
    try {
      await services.dataset.save(name, sourceConfig, id);
    } finally {
      if (id) services.analysis.endDatasetUpdate(id);
    }
    changed();
  });

  ipcMain.handle('datasetPreview', (_event, id: string, table?: string, options?: DatasetPreviewOptions) =>
    services.dataset.preview(id, table, options),
  );

  ipcMain.handle('datasetSuggest', (_event, id: string) =>
    services.dataset.suggest(id, services.model.getDefaultModelConfig()),
  );

  ipcMain.handle('datasetRename', (_event, id: string, name: string) => {
    services.dataset.rename(id, name);
    changed();
  });

  ipcMain.handle('datasetDelete', (_event, id: string) => {
    services.dataset.remove(id);
    changed();
  });

  ipcMain.handle('datasetSaveSemantic', (_event, id: string, semantic: Semantic) => {
    services.dataset.saveSemantic(id, semantic);
    changed();
  });

  ipcMain.handle('conversationRename', (_event, id: string, title: string) => {
    services.conversation.rename(id, title);
    changed();
  });

  ipcMain.handle('conversationArchive', (_event, id: string) => {
    services.conversation.archive(id);
    changed();
  });

  ipcMain.handle('conversationRestore', (_event, id: string) => {
    services.conversation.restore(id);
    changed();
  });

  ipcMain.handle('conversationPurge', (_event, ids: string[]) => {
    services.conversation.purge(ids);
    changed();
  });

  ipcMain.handle('analysisStart', (_event, input: AnalysisStartInput) => {
    const result = services.analysis.start(
      input,
      services.model.getDefaultModelConfig(),
      services.settings.getPreferences(),
      (progress) => {
        notifyRenderer('analysis:message-progress', progress);
        if (progress.status !== 'running') changed();
      },
    );
    changed();
    return result;
  });

  ipcMain.handle('analysisCancel', (_event, messageId: string) => services.analysis.cancel(messageId));

  ipcMain.handle('analysisGetMessages', (_event, conversationId: string) =>
    services.analysis.getMessages(conversationId),
  );

  ipcMain.handle('snippetSave', (_event, input: SnippetSaveInput) => {
    const result = services.snippet.save(input);
    changed();
    return result;
  });

  ipcMain.handle('snippetRemove', (_event, messageId: string) => {
    services.snippet.remove(messageId);
    changed();
  });

  ipcMain.handle('snippetUpdate', (_event, messageId: string, input: SnippetUpdateInput) => {
    services.snippet.update(messageId, input);
    changed();
  });

  ipcMain.handle('settingsSavePreferences', (_event, preferences: Preferences) => {
    services.settings.savePreferences(preferences);
    changed();
  });

  ipcMain.handle('systemGetStorageInfo', () => getStorageInfo());

  ipcMain.handle('systemOpen', (_event, type: 'directory' | 'url', path: string) => systemOpen(type, path));

  ipcMain.handle('aboutGetVersion', () => app.getVersion());

  ipcMain.handle('aboutCheckUpdates', () => checkForUpdates());

  ipcMain.handle('modelListAvailable', (_event, input: ModelConnectionInput) =>
    services.model.listAvailable(input),
  );

  ipcMain.handle('modelSave', async (event, input: ModelInput) => {
    await services.model.test(input, (progress) => event.sender.send('model:test-progress', progress));
    services.model.save(input);
    changed();
  });

  ipcMain.handle('modelActivate', (_event, id: string, model?: string) => {
    services.model.activate(id, model);
    changed();
  });

  ipcMain.handle('modelDelete', (_event, id: string) => {
    services.model.remove(id);
    changed();
  });
}
