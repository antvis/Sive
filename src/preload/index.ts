import { contextBridge, ipcRenderer } from 'electron';
import type { ModelTestProgress, TaskUpdate } from '@shared/contracts';
import { commandNames } from '@shared/commands';
import { WorkbenchError, type Reply } from '@shared/errors';

function unwrap<T>(reply: Reply<T>): T {
  if (!reply.ok) throw new WorkbenchError(reply.error.code, reply.error.message);
  return reply.value;
}
window.addEventListener('DOMContentLoaded', () => {
  document.documentElement.dataset.platform = process.platform;
});
const api: Record<string, unknown> = Object.fromEntries(
  commandNames.map((name) => [
    name,
    (...args: unknown[]) => ipcRenderer.invoke('workbench:' + name, ...args).then(unwrap),
  ]),
);
api.workspaceOnChange = (callback: () => void) => {
  const listener = () => callback();
  ipcRenderer.on('workbench:change', listener);
  return () => ipcRenderer.removeListener('workbench:change', listener);
};
api.analysisOnTaskChange = (callback: (update: TaskUpdate) => void) => {
  const listener = (_event: Electron.IpcRendererEvent, update: TaskUpdate) => callback(update);
  ipcRenderer.on('workbench:task', listener);
  return () => ipcRenderer.removeListener('workbench:task', listener);
};
api.modelOnTestProgress = (callback: (progress: ModelTestProgress) => void) => {
  const listener = (_event: Electron.IpcRendererEvent, progress: ModelTestProgress) => callback(progress);
  ipcRenderer.on('workbench:model-test', listener);
  return () => ipcRenderer.removeListener('workbench:model-test', listener);
};
contextBridge.exposeInMainWorld('workbench', api);
