import { resolve } from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: { '@renderer': resolve('src/renderer'), '@shared': resolve('src/shared') },
  },
});
