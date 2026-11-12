import type { WorkbenchApi } from '../preload/api';

declare global {
  interface Window {
    workbench: WorkbenchApi;
  }
}

export {};
