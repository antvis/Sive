import { app, BrowserWindow, dialog, nativeTheme } from 'electron';
import path from 'node:path';
import { createDataServices, type DataServices } from '@main/db';
import { ModelService } from '@main/services/settings/ModelService';
import { createWorkbenchServices } from '@main/services';
import { ConnectionService } from '@main/services/data/ConnectionService';
import { themePalette } from '@shared/theme';
import { encrypt, decrypt } from '@main/utils/credentials';
import { createHandlers } from '@main/ipc/handlers';
import { registerIPC } from '@main/ipc';

app.setName('Sive');
app.setPath('userData', process.env.SIVE_DATA || path.join(app.getPath('appData'), 'sive'));
let win: BrowserWindow;
if (!app.requestSingleInstanceLock()) app.exit(0);
app.on('second-instance', () => {
  if (win && !win.isDestroyed()) {
    if (win.isMinimized()) win.restore();
    win.focus();
  }
});
app.whenReady().then(async () => {
  const icon = path.join(app.getAppPath(), 'assets', process.platform === 'win32' ? 'sive.ico' : 'sive.png');
  if (process.platform === 'darwin') app.dock?.setIcon(icon);
  const root = app.getPath('userData');
  let data: DataServices;
  try {
    data = createDataServices(root);
  } catch (error) {
    await dialog.showMessageBox({
      type: 'error',
      title: '无法打开工作区',
      message: '工作区数据库无法读取，原文件已保留。',
      detail: `${error instanceof Error ? error.message : '读取失败'}\n数据目录：${root}\n请检查目录权限或从备份恢复后重启应用。`,
      buttons: ['退出'],
      defaultId: 0,
      cancelId: 0,
    });
    app.quit();
    return;
  }
  const models = new ModelService(data.providers, encrypt, decrypt);
  let revision = 0;
  const change = () => {
    revision++;
    if (win && !win.isDestroyed()) win.webContents.send('workbench:change');
  };
  const services = createWorkbenchServices(
    data,
    models,
    change,
    new ConnectionService(data.datasets),
    (task) => {
      revision++;
      if (win && !win.isDestroyed()) win.webContents.send('workbench:task', { revision, task });
    },
  );
  nativeTheme.themeSource = data.settings.theme().mode;
  win = new BrowserWindow({
    width: 1440,
    height: 960,
    minWidth: 980,
    minHeight: 700,
    title: 'Sive',
    ...(process.platform === 'darwin'
      ? { titleBarStyle: 'hidden' as const, trafficLightPosition: { x: 14, y: 10 } }
      : {}),
    icon,
    backgroundColor: themePalette(data.settings.theme()).background,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  const dev = process.env.ELECTRON_RENDERER_URL;

  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  win.webContents.on('will-navigate', (e) => e.preventDefault());
  win.webContents.on('will-prevent-unload', (event) => {
    const choice = dialog.showMessageBoxSync(win, {
      type: 'question',
      buttons: ['返回保存', '放弃修改并离开'],
      defaultId: 0,
      cancelId: 0,
      message: '还有未保存的修改',
      detail: '关闭或刷新窗口会丢弃草稿。',
    });
    if (choice === 1) event.preventDefault();
  });
  win.webContents.session.setPermissionRequestHandler((_w, _p, callback) => callback(false));
  registerIPC(
    win,
    createHandlers(win, data, services, models, root, () => revision, change),
  );
  if (dev) win.loadURL(dev);
  else win.loadFile(path.join(__dirname, '../dist/index.html'));
  app.on('before-quit', () => services.analysis.cancelAll());
  app.on('will-quit', () => data.database.close());
});
app.on('window-all-closed', () => app.quit());
