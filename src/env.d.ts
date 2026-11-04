/// <reference types="vite/client" />
import type { API } from '../shared/contracts';
declare global {
  interface Window {
    workbench: API;
  }
}
