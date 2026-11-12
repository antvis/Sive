import type { WorkbenchApi } from '@shared/api';

declare global {
  interface Window {
    workbench: WorkbenchApi;
  }
}

export {};
