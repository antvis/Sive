import { defineConfig } from 'electron-vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { resolve } from 'node:path';

// Electron must launch as a desktop app even when the parent runs in Node mode.
delete process.env.ELECTRON_RUN_AS_NODE;

export default defineConfig(({ command }) => ({
  main: {
    resolve: { alias: { '@main': resolve('src/main'), '@shared': resolve('src/shared') } },
    build: {
      outDir: 'dist-electron',
      // Watch rebuilds must preserve the preload bundle in this shared directory.
      emptyOutDir: command === 'build',
      target: 'node22',
      sourcemap: true,
      lib: { entry: 'src/main/index.ts', formats: ['cjs'] },
      rolldownOptions: { output: { entryFileNames: 'main.cjs' } },
    },
  },
  preload: {
    resolve: { alias: { '@shared': resolve('src/shared') } },
    build: {
      outDir: 'dist-electron',
      // Main and preload share this directory; keep the main build intact.
      emptyOutDir: false,
      externalizeDeps: false,
      target: 'node22',
      sourcemap: true,
      lib: { entry: 'src/preload/index.ts', formats: ['cjs'] },
      rolldownOptions: { output: { entryFileNames: 'preload.cjs' } },
    },
  },
  renderer: {
    root: 'src/renderer',
    publicDir: resolve('assets'),
    resolve: {
      alias: { '@assets': resolve('assets'), '@shared': resolve('src/shared') },
    },
    base: './',
    plugins: [react(), tailwindcss()],
    server: { host: '127.0.0.1', port: Number(process.env.SIVE_DEV_PORT || 5184), strictPort: true },
    build: {
      outDir: resolve('dist'),
      minify: true,
      chunkSizeWarningLimit: 1600,
      rolldownOptions: { input: resolve('src/renderer/index.html') },
    },
  },
}));
