import type { WorkbenchApi } from '../src/preload/api';

declare global {
  interface Window {
    workbench: WorkbenchApi;
  }
}

export {};
