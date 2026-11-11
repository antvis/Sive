import path from 'node:path';
import { app, BrowserWindow } from 'electron';
import { DBConnection } from './db';
import { registerIpc } from './ipc';
import { createServices } from './services';

let database: DBConnection | undefined;

function createWindow() {
  const window = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    title: 'Sive',
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    trafficLightPosition: { x: 16, y: 16 },
    autoHideMenuBar: true,
    backgroundColor: '#f5f6f8',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  if (process.env.ELECTRON_RENDERER_URL) void window.loadURL(process.env.ELECTRON_RENDERER_URL);
  else void window.loadFile(path.join(__dirname, '../dist/index.html'));
}

async function initialize() {
  database = await DBConnection.connect(app.getPath('userData'));
  registerIpc(createServices(database));
  createWindow();
}

void app
  .whenReady()
  .then(initialize)
  .catch((error: unknown) => {
    console.error('Failed to initialize the main process.', error);
    app.quit();
  });

app.on('activate', () => {
  if (database && BrowserWindow.getAllWindows().length === 0) createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('will-quit', () => {
  database?.close();
  database = undefined;
});
