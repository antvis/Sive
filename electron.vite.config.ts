import { defineConfig } from 'electron-vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// Electron must launch as a desktop app even when the parent runs in Node mode.
delete process.env.ELECTRON_RUN_AS_NODE;

export default defineConfig(({ command }) => ({
  main: {
    build: {
      outDir: 'dist-electron',
      // Watch rebuilds must preserve the preload bundle in this shared directory.
      emptyOutDir: command === 'build',
      target: 'node22',
      sourcemap: true,
      lib: { entry: 'electron/main.ts', formats: ['cjs'], fileName: () => 'main.cjs' },
    },
  },
  preload: {
    build: {
      outDir: 'dist-electron',
      // Main and preload share this directory; keep the main build intact.
      emptyOutDir: false,
      externalizeDeps: false,
      target: 'node22',
      sourcemap: true,
      lib: { entry: 'electron/preload.ts', formats: ['cjs'], fileName: () => 'preload.cjs' },
    },
  },
  renderer: {
    root: '.',
    base: './',
    plugins: [react(), tailwindcss()],
    server: { host: '127.0.0.1', port: Number(process.env.SIVE_DEV_PORT || 5184), strictPort: true },
    build: {
      outDir: 'dist',
      minify: true,
      chunkSizeWarningLimit: 1600,
      rolldownOptions: { input: 'index.html' },
    },
  },
}));
