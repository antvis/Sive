import path from 'node:path';
import { app, BrowserWindow, dialog, ipcMain } from 'electron';
import type { WebContents } from 'electron';
import type { DataSourceConfig, Semantic } from '@antv/ava';
import type { SnippetSaveInput, SnippetUpdateInput } from '@shared/schema';
import type { Services } from '../services';
import type {
  AnalysisStartInput,
  DatasetPreviewOptions,
  ModelConnectionInput,
  ModelInput,
  Preferences,
  SnippetExportInput,
} from '@shared/api';
import { FILE_SOURCES } from '@shared/dataSource';
import { analysisStartSchema } from '@shared/api';
import { githubRepositoryListSchema, githubConnectionIdSchema } from '@shared/github';
import type { LocalFileFormat } from '@shared/dataSource';
import { setLocale } from '../util/i18n';
import { localSource } from '../util/localFile';
import { getStorageInfo, systemOpen } from '../util/system';
import { exportSnippet } from '../util/snippetExport';

export const WORKSPACE_CHANGED_CHANNEL = 'workspace:changed';

export function registerIpc(
  services: Services,
  settingsWindow: { open: () => Promise<void>; close: (sender: WebContents) => void },
) {
  let revision = 0;

  services.update.onUpdateAvailable(() => {
    const window = BrowserWindow.getFocusedWindow() ?? BrowserWindow.getAllWindows()[0];
    if (window && !window.isDestroyed()) window.webContents.send('about:update-available');
  });

  const changed = () => {
    revision += 1;
    for (const { webContents } of BrowserWindow.getAllWindows()) {
      if (!webContents.isDestroyed()) webContents.send(WORKSPACE_CHANGED_CHANNEL);
    }
  };

  ipcMain.handle('settingsOpen', () => settingsWindow.open());
  ipcMain.on('settingsClose', ({ sender }) => settingsWindow.close(sender));
  ipcMain.handle('windowIsFullscreen', ({ sender }) =>
    BrowserWindow.fromWebContents(sender)?.isFullScreen() ?? false,
  );

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

  ipcMain.handle('datasetTest', (_event, sourceConfig: DataSourceConfig, authSessionId?: string) =>
    services.dataset.test(sourceConfig, authSessionId),
  );

  ipcMain.handle('githubConnect', (_event, connectionId: unknown) =>
    services.dataset.connectGitHub(githubConnectionIdSchema.parse(connectionId)),
  );

  ipcMain.handle('githubConnectCancel', (_event, connectionId: unknown) =>
    services.dataset.cancelGitHubConnect(githubConnectionIdSchema.parse(connectionId)),
  );

  ipcMain.handle('githubRepositories', (_event, input: unknown) =>
    services.dataset.githubRepositories(githubRepositoryListSchema.parse(input)),
  );

  ipcMain.handle('oAuthStart', async (event, type: DataSourceConfig['type']) => {
    const result = await services.dataset.oAuthStart(type);
    if (process.platform === 'darwin') app.focus({ steal: true });
    const window = BrowserWindow.fromWebContents(event.sender);
    window?.show();
    window?.focus();
    return result;
  });

  ipcMain.handle('datasetExtractText', (_event, text: string) =>
    services.dataset.extractText(text, services.model.getDefaultModelConfig()),
  );

  ipcMain.handle(
    'datasetSave',
    async (_event, name: string, sourceConfig: DataSourceConfig, id?: string, authSessionId?: string) => {
      if (id) await services.analysis.beginDatasetUpdate(id);
      try {
        await services.dataset.save(name, sourceConfig, id, authSessionId);
      } finally {
        if (id) services.analysis.endDatasetUpdate(id);
      }
      changed();
    },
  );

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

  ipcMain.handle('analysisStart', async ({ sender }, input: AnalysisStartInput, subscriptionId: string) => {
    input = await analysisStartSchema.parseAsync(input);
    await services.dataset.prepareOAuth(input.datasetId);
    const titleUpdate = services.analysis.start(
      input,
      services.model.getDefaultModelConfig(),
      services.settings.getPreferences(),
      (chunk) => {
        if (!sender.isDestroyed()) sender.send('analysis:chunk', subscriptionId, input.message.id, chunk);
      },
    );
    changed();
    void titleUpdate?.then((renamed) => {
      if (renamed) changed();
    });
  });

  ipcMain.handle('analysisReconnect', ({ sender }, conversationId: string, subscriptionId: string) => {
    return services.analysis.reconnect(conversationId, (messageId, chunk) => {
      if (!sender.isDestroyed()) sender.send('analysis:chunk', subscriptionId, messageId, chunk);
    });
  });

  ipcMain.handle('analysisCancel', (_event, conversationId: string) =>
    services.analysis.cancel(conversationId),
  );

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

  ipcMain.handle('snippetExport', (event, input: SnippetExportInput) =>
    exportSnippet(input, BrowserWindow.fromWebContents(event.sender)!),
  );

  ipcMain.handle('settingsSavePreferences', (_event, preferences: Preferences) => {
    services.settings.savePreferences(preferences);
    services.update.setAutomatic(preferences.autoCheckUpdates);
    setLocale(preferences.language);
    changed();
  });

  ipcMain.handle('systemGetStorageInfo', () => getStorageInfo());

  ipcMain.handle('systemOpen', (_event, type: 'directory' | 'url', path: string) => systemOpen(type, path));

  ipcMain.handle('aboutGetVersion', () => app.getVersion());

  ipcMain.handle('aboutCheckUpdates', () => services.update.check());

  ipcMain.handle('aboutTakeUpdateNotification', () => services.update.takeNotification());

  ipcMain.handle('modelListAvailable', (_event, input: ModelConnectionInput) =>
    services.model.listAvailable(input),
  );

  ipcMain.handle('modelSave', async ({ sender }, input: ModelInput) => {
    await services.model.test(input, (progress) => {
      if (!sender.isDestroyed()) sender.send('model:test-progress', progress);
    });
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
