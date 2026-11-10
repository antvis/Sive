import { app, BrowserWindow, dialog, nativeTheme } from 'electron';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { createRepositories, type Repositories } from './db';
import { createWorkbenchServices, type WorkbenchServices } from './services';
import { themePalette } from '@shared/theme';
import { encrypt, decrypt } from './utils/credentials';
import { registerIPC } from './ipc';

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
  let revision = 0;
  const change = () => {
    revision++;
    if (win && !win.isDestroyed()) win.webContents.send('workbench:change');
  };
  let data: Repositories | undefined;
  let services: WorkbenchServices;
  try {
    data = await createRepositories(root);
    services = createWorkbenchServices(data, encrypt, decrypt, change, (task) => {
      revision++;
      if (win && !win.isDestroyed()) win.webContents.send('workbench:task', { revision, task });
    });
  } catch (error) {
    data?.database.close();
    await dialog.showMessageBox({
      type: 'error',
      title: '无法打开工作区',
      message: '工作区数据库无法读取或重建。',
      detail: `${error instanceof Error ? error.message : '读取失败'}\n数据目录：${root}\n请检查目录权限后重启应用。`,
      buttons: ['退出'],
      defaultId: 0,
      cancelId: 0,
    });
    app.quit();
    return;
  }
  nativeTheme.themeSource = services.settings.theme().mode;
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
    backgroundColor: themePalette(services.settings.theme()).background,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  const rendererFile = path.join(__dirname, '../dist/index.html');
  const configuredDevURL = !app.isPackaged ? process.env.ELECTRON_RENDERER_URL : undefined;
  let devURL: URL | undefined;
  if (configuredDevURL) {
    try {
      const candidate = new URL(configuredDevURL);
      if (
        candidate.protocol === 'http:' &&
        candidate.hostname === '127.0.0.1' &&
        candidate.port === String(Number(process.env.SIVE_DEV_PORT || 5184)) &&
        candidate.pathname === '/' &&
        !candidate.username &&
        !candidate.password &&
        !candidate.search
      )
        devURL = candidate;
    } catch {
      // An invalid development URL must not become a privileged renderer.
    }
    if (!devURL) {
      dialog.showErrorBox('无法启动开发页面', '开发页面地址必须是本机配置的 HTTP 端口。');
      app.quit();
      return;
    }
  }

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

  registerIPC(win, services, root, () => revision, devURL ?? pathToFileURL(rendererFile));
  if (devURL) win.loadURL(devURL.href);
  else win.loadFile(rendererFile);
  app.on('before-quit', () => services.analysis.cancelAll());
  app.on('will-quit', () => data?.database.close());
});
app.on('window-all-closed', () => app.quit());
