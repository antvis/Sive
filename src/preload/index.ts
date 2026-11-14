import { contextBridge, ipcRenderer } from 'electron';
import type { IpcRendererEvent } from 'electron';
import type { AnalysisTaskEvent, ModelTestProgress, WorkbenchApi } from './api';

const api = {
  workspaceGetState: () => ipcRenderer.invoke('workspaceGetState'),
  workspaceOnChange: (callback: () => void) => {
    const listener = () => callback();
    ipcRenderer.on('workspace:changed', listener);
    return () => ipcRenderer.removeListener('workspace:changed', listener);
  },
  datasetImportLocal: (format, lastDirectory) =>
    ipcRenderer.invoke('datasetImportLocal', format, lastDirectory),
  datasetRelocate: (id) => ipcRenderer.invoke('datasetRelocate', id),
  datasetRefresh: (id) => ipcRenderer.invoke('datasetRefresh', id),
  datasetGet: (id) => ipcRenderer.invoke('datasetGet', id),
  datasetPreview: (id, table, options) => ipcRenderer.invoke('datasetPreview', id, table, options),
  datasetSuggest: (id) => ipcRenderer.invoke('datasetSuggest', id),
  datasetSaveSemantic: (id, semantic) => ipcRenderer.invoke('datasetSaveSemantic', id, semantic),
  datasetRename: (id, name) => ipcRenderer.invoke('datasetRename', id, name),
  datasetDelete: (id) => ipcRenderer.invoke('datasetDelete', id),
  settingsSaveTheme: (theme) => ipcRenderer.invoke('settingsSaveTheme', theme),
  settingsSavePreferences: (preferences) => ipcRenderer.invoke('settingsSavePreferences', preferences),
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
  analysisCancel: (taskId) => ipcRenderer.invoke('analysisCancel', taskId),
  analysisGetMessages: (conversationId) => ipcRenderer.invoke('analysisGetMessages', conversationId),
  analysisOnTaskChange: (callback) => {
    const listener = (_event: IpcRendererEvent, progress: AnalysisTaskEvent) => callback(progress);
    ipcRenderer.on('analysis:task-change', listener);
    return () => ipcRenderer.removeListener('analysis:task-change', listener);
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
