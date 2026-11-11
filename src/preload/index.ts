import { contextBridge, ipcRenderer } from 'electron';
import type { IpcRendererEvent } from 'electron';
import type { ModelTestProgress, WorkbenchApi } from './api';

const api = {
  workspaceGetState: () => ipcRenderer.invoke('workspaceGetState'),
  workspaceOnChange: (callback: () => void) => {
    const listener = () => callback();
    ipcRenderer.on('workspace:changed', listener);
    return () => ipcRenderer.removeListener('workspace:changed', listener);
  },
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
  conversationRestore: (id) => ipcRenderer.invoke('conversationRestore', id),
  conversationPurge: (ids) => ipcRenderer.invoke('conversationPurge', ids),
} satisfies WorkbenchApi;

contextBridge.exposeInMainWorld('workbench', api);
