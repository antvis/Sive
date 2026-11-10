/// <reference types="vite/client" />
import type { API } from '@shared/contracts';

declare module 'react' {
  interface CSSProperties {
    [property: `--${string}`]: string | number | undefined;
  }
}

declare global {
  interface Window {
    workbench: API;
  }
}
