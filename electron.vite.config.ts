import { defineConfig } from 'electron-vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { resolve } from 'node:path';
import { renameSync, rmSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { dirname } from 'node:path';

// Electron must launch as a desktop app even when the parent runs in Node mode.
delete process.env.ELECTRON_RUN_AS_NODE;

export default defineConfig(({ command }) => {
  if (command === 'serve' && process.platform === 'darwin') {
    const require = createRequire(import.meta.url);
    const appBundle = resolve(dirname(require('electron')), '../..');
    const namedAppBundle = resolve(dirname(appBundle), 'Sive.app');

    // macOS can display the .app filename instead of the name in Info.plist.
    if (appBundle !== namedAppBundle) {
      // Reinstalling Electron restores Electron.app alongside the previously renamed bundle.
      rmSync(namedAppBundle, { recursive: true, force: true });
      renameSync(appBundle, namedAppBundle);
      writeFileSync(
        resolve(dirname(require.resolve('electron')), 'path.txt'),
        'Sive.app/Contents/MacOS/Electron',
      );
    }
    process.env.ELECTRON_EXEC_PATH = resolve(namedAppBundle, 'Contents/MacOS/Electron');
    const plist = resolve(namedAppBundle, 'Contents/Info.plist');

    // macOS reads the Dock label from the app bundle, not Electron's app.setName().
    for (const key of ['CFBundleDisplayName', 'CFBundleName']) {
      execFileSync('/usr/libexec/PlistBuddy', ['-c', `Set :${key} Sive`, plist]);
    }
  }

  return {
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
        alias: {
          '@assets': resolve('assets'),
          '@shared': resolve('src/shared'),
        },
      },
      base: './',
      plugins: [react(), tailwindcss()],
      server: { host: '127.0.0.1', port: Number(process.env.SIVE_DEV_PORT || 5184), strictPort: true },
      build: {
        outDir: resolve('dist'),
        minify: true,
        sourcemap: 'hidden',
        chunkSizeWarningLimit: 1600,
        rolldownOptions: { input: resolve('src/renderer/index.html') },
      },
    },
  };
});
