import { defineConfig } from 'vite';

export default defineConfig({
  root: 'site',
  base: './',
  publicDir: false,
  server: { port: 4173, strictPort: true },
  preview: { port: 4173, strictPort: true },
  css: {
    transformer: 'lightningcss',
    lightningcss: {
      targets: {
        chrome: 111 << 16,
        edge: 111 << 16,
        firefox: 114 << 16,
        safari: (16 << 16) | (4 << 8),
        ios_saf: (16 << 16) | (4 << 8),
      },
    },
  },
  build: {
    target: ['chrome111', 'edge111', 'firefox114', 'safari16.4', 'ios16.4'],
    cssMinify: 'lightningcss',
  },
});
