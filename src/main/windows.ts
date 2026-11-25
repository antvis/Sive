import path from 'node:path';
import { BrowserWindow } from 'electron';
import type { BrowserWindowConstructorOptions, WebContents } from 'electron';

type AppWindow = 'workspace' | 'settings';

export const appIconPath = path.join(__dirname, '../assets/sive.png');

const windowDefaults = {
  icon: appIconPath,
  show: false,
  autoHideMenuBar: true,
  backgroundColor: '#f5f6f8',
  webPreferences: {
    preload: path.join(__dirname, 'preload.cjs'),
    contextIsolation: true,
    nodeIntegration: false,
    sandbox: true,
  },
} satisfies BrowserWindowConstructorOptions;

const windowDefinitions: Record<AppWindow, { options: BrowserWindowConstructorOptions; hash?: string }> = {
  workspace: {
    options: {
      title: 'Sive',
      width: 1280,
      height: 800,
      minWidth: 900,
      minHeight: 600,
      titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
      titleBarOverlay: process.platform === 'darwin',
      trafficLightPosition: { x: 16, y: 16 },
    },
  },
  settings: {
    hash: 'settings',
    options: {
      title: '设置',
      width: 864,
      height: 640,
      minWidth: 600,
      minHeight: 420,
      frame: process.platform === 'darwin',
      ...(process.platform === 'darwin' && {
        titleBarStyle: 'hidden',
        trafficLightPosition: { x: 16, y: 14 },
      }),
      minimizable: false,
      maximizable: false,
      fullscreenable: false,
    },
  },
};

const windows = new Map<AppWindow, BrowserWindow>();

export function getAppWindow(kind: AppWindow) {
  return windows.get(kind);
}

export function isAppWindowOpen(kind: AppWindow) {
  return windows.has(kind);
}

export function closeAppWindow(kind: AppWindow, sender: WebContents) {
  const window = windows.get(kind);
  if (window?.webContents.id === sender.id) window.close();
}

function loadRenderer(window: BrowserWindow, hash?: string) {
  if (process.env.ELECTRON_RENDERER_URL) {
    const url = new URL(process.env.ELECTRON_RENDERER_URL);
    if (hash) url.hash = hash;
    return window.loadURL(url.href);
  }

  return window.loadFile(path.join(__dirname, '../dist/index.html'), { hash });
}

export async function openAppWindow(kind: AppWindow) {
  const existing = windows.get(kind);
  if (existing) {
    if (existing.isMinimized()) existing.restore();
    existing.focus();
    return;
  }

  const { options, hash } = windowDefinitions[kind];
  const window = new BrowserWindow({ ...windowDefaults, ...options });
  windows.set(kind, window);
  window.once('ready-to-show', () => window.show());
  window.once('closed', () => windows.delete(kind));

  try {
    await loadRenderer(window, hash);
  } catch (cause) {
    if (!window.isDestroyed()) window.destroy();
    throw cause;
  }
}
