import '@sentry/electron/preload';
import { contextBridge, ipcRenderer } from 'electron';
import type { IpcRendererEvent } from 'electron';
import type { UIMessageChunk } from 'ai';
import type { ModelTestProgress, WorkbenchApi } from './api';

const api = {
  isMacOS: process.platform === 'darwin',
  workspaceGetState: () => ipcRenderer.invoke('workspaceGetState'),
  workspaceOnChange: (callback: () => void) => {
    const listener = () => callback();
    ipcRenderer.on('workspace:changed', listener);
    return () => ipcRenderer.removeListener('workspace:changed', listener);
  },
  datasetSelectLocal: (format, lastDirectory) =>
    ipcRenderer.invoke('datasetSelectLocal', format, lastDirectory),
  datasetRefresh: (id) => ipcRenderer.invoke('datasetRefresh', id),
  datasetTest: (sourceConfig, authSessionId) =>
    ipcRenderer.invoke('datasetTest', sourceConfig, authSessionId),
  datasetExtractText: (text) => ipcRenderer.invoke('datasetExtractText', text),
  datasetSave: (name, sourceConfig, id, authSessionId) =>
    ipcRenderer.invoke('datasetSave', name, sourceConfig, id, authSessionId),
  oAuthStart: (type) => ipcRenderer.invoke('oAuthStart', type),
  githubConnect: (connectionId) => ipcRenderer.invoke('githubConnect', connectionId),
  githubConnectCancel: (connectionId) => ipcRenderer.invoke('githubConnectCancel', connectionId),
  githubRepositories: (input) => ipcRenderer.invoke('githubRepositories', input),
  datasetGet: (id) => ipcRenderer.invoke('datasetGet', id),
  datasetPreview: (id, table, options) => ipcRenderer.invoke('datasetPreview', id, table, options),
  datasetSuggest: (id) => ipcRenderer.invoke('datasetSuggest', id),
  datasetSaveSemantic: (id, semantic) => ipcRenderer.invoke('datasetSaveSemantic', id, semantic),
  datasetRename: (id, name) => ipcRenderer.invoke('datasetRename', id, name),
  datasetDelete: (id) => ipcRenderer.invoke('datasetDelete', id),
  settingsOpen: () => ipcRenderer.invoke('settingsOpen'),
  settingsClose: () => ipcRenderer.send('settingsClose'),
  settingsSavePreferences: (preferences) => ipcRenderer.invoke('settingsSavePreferences', preferences),
  systemGetStorageInfo: () => ipcRenderer.invoke('systemGetStorageInfo'),
  systemOpen: (type, path) => ipcRenderer.invoke('systemOpen', type, path),
  aboutGetVersion: () => ipcRenderer.invoke('aboutGetVersion'),
  aboutCheckUpdates: () => ipcRenderer.invoke('aboutCheckUpdates'),
  aboutTakeUpdateNotification: () => ipcRenderer.invoke('aboutTakeUpdateNotification'),
  aboutOnUpdateAvailable: (callback) => {
    const listener = () => callback();
    ipcRenderer.on('about:update-available', listener);
    return () => ipcRenderer.removeListener('about:update-available', listener);
  },
  modelListAvailable: (input) => ipcRenderer.invoke('modelListAvailable', input),
  modelSave: (input) => ipcRenderer.invoke('modelSave', input),
  modelOnTestProgress: (callback) => {
    const listener = (_event: IpcRendererEvent, progress: ModelTestProgress) => callback(progress);
    ipcRenderer.on('model:test-progress', listener);
    return () => ipcRenderer.removeListener('model:test-progress', listener);
  },
  modelActivate: (id, model) => ipcRenderer.invoke('modelActivate', id, model),
  modelDelete: (id) => ipcRenderer.invoke('modelDelete', id),
  analysisStart: (input) => ipcRenderer.invoke('analysisStart', input),
  analysisCancel: (conversationId) => ipcRenderer.invoke('analysisCancel', conversationId),
  analysisGetMessages: (conversationId) => ipcRenderer.invoke('analysisGetMessages', conversationId),
  analysisOnChunk: (callback) => {
    const listener = (_event: IpcRendererEvent, messageId: string, chunk: UIMessageChunk | null) =>
      callback(messageId, chunk);
    ipcRenderer.on('analysis:chunk', listener);
    return () => ipcRenderer.removeListener('analysis:chunk', listener);
  },
  conversationRename: (id, title) => ipcRenderer.invoke('conversationRename', id, title),
  conversationArchive: (id) => ipcRenderer.invoke('conversationArchive', id),
  snippetSave: (input) => ipcRenderer.invoke('snippetSave', input),
  snippetUpdate: (messageId, input) => ipcRenderer.invoke('snippetUpdate', messageId, input),
  snippetRemove: (messageId) => ipcRenderer.invoke('snippetRemove', messageId),
  conversationRestore: (id) => ipcRenderer.invoke('conversationRestore', id),
  conversationPurge: (ids) => ipcRenderer.invoke('conversationPurge', ids),
} satisfies WorkbenchApi;

contextBridge.exposeInMainWorld('workbench', api);
