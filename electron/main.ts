import type { API } from '../shared/contracts';
import { commandNames, invokeCommand, type CommandHandlers } from '../shared/commands';
import { failure, WorkbenchError } from '../shared/errors';
import { app, BrowserWindow, clipboard, dialog, ipcMain, safeStorage, nativeTheme } from 'electron';
import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { Store } from '../backend/store';
import { WorkspaceLoadError, WorkspaceStorage } from '../backend/workspace-storage';
import { Models } from '../backend/models';
import { Workbench } from '../backend/workbench';
import { Connections } from '../backend/connections';
import { themePalette } from '../shared/theme';
import { analysisHTML } from '../backend/render';
import { conversationHTML, conversationMarkdown } from '../backend/conversation-export';
import { exportFilename } from './export-filename';
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
  let store: Store;
  try {
    store = new Store(root);
  } catch (error) {
    const recoverable = error instanceof WorkspaceLoadError && error.canRecover;
    const { response } = await dialog.showMessageBox({
      type: 'error',
      title: '无法打开工作区',
      message: '工作区无法读取，原文件已保留。',
      detail:
        `${error instanceof Error ? error.message : '读取失败'}\n数据目录：${root}` +
        (recoverable
          ? '\n可以恢复到上一次成功保存的状态；最近一次修改可能需要重新操作。'
          : '\n请检查目录权限或从备份恢复后重启应用。'),
      buttons: recoverable ? ['退出', '恢复上次保存'] : ['退出'],
      defaultId: 0,
      cancelId: 0,
    });
    if (!recoverable || response !== 1) {
      app.quit();
      return;
    }
    try {
      new WorkspaceStorage(root).recover();
      store = new Store(root);
    } catch {
      dialog.showErrorBox('恢复失败', `未能恢复工作区，请检查目录权限。原文件保留在：${root}`);
      app.quit();
      return;
    }
  }
  const encrypt = (s: string) => {
    if (
      !safeStorage.isEncryptionAvailable() ||
      (process.platform === 'linux' && safeStorage.getSelectedStorageBackend() === 'basic_text')
    )
      throw new WorkbenchError('CREDENTIALS', '系统安全存储不可用，无法保存密钥');
    return safeStorage.encryptString(s).toString('base64');
  };
  const decrypt = (s: string) => safeStorage.decryptString(Buffer.from(s, 'base64'));
  const models = new Models(store, encrypt, decrypt);
  let revision = 0;
  const controller = new Workbench(
    store,
    models,
    () => {
      revision++;
      if (win && !win.isDestroyed()) win.webContents.send('workbench:change');
    },
    new Connections(store, encrypt, decrypt),
    (task) => {
      revision++;
      if (win && !win.isDestroyed()) win.webContents.send('workbench:task', { revision, task });
    },
  );
  nativeTheme.themeSource = store.theme().mode;
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
    backgroundColor: themePalette(store.theme()).background,
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
  const methods: CommandHandlers = {
    writeClipboard: (text) => clipboard.writeText(text),
    run: (id) => store.run(id),
    state: () => ({
      ...store.publicState(controller.analysis.task),
      refreshingSavedId: controller.saved.refreshingId,
      revision,
    }),
    saveTheme: (theme) => {
      store.saveTheme(theme);
      nativeTheme.themeSource = store.theme().mode;
      win.setBackgroundColor(themePalette(store.theme()).background);
      controller.change();
    },
    testMySQL: (input) => controller.datasets.testMySQL(input),
    saveMySQL: (input) => controller.datasets.saveMySQL(input),
    refreshMySQL: (id) => controller.datasets.refreshMySQL(id),
    importData: async () => {
      let defaultPath: string | undefined;
      try {
        const directory = store.view.lastImportDirectory;
        if (directory && fs.statSync(directory).isDirectory()) defaultPath = directory;
      } catch {
        // A moved or unavailable directory should not prevent opening the picker.
      }
      const r = await dialog.showOpenDialog(win, {
        defaultPath,
        properties: ['openFile'],
        filters: [{ name: '数据文件', extensions: ['csv', 'xlsx', 'json', 'parquet'] }],
      });
      if (r.canceled || !r.filePaths[0]) return null;
      store.rememberImportDirectory(path.dirname(r.filePaths[0]));
      return controller.datasets.import(r.filePaths[0]);
    },
    createConversation: (datasetId) => {
      const conversation = store.createConversation(datasetId);
      controller.change();
      return conversation;
    },
    deleteData: (id) => controller.datasets.deleteData(id),
    deleteConversation: (id) => {
      const refreshing = controller.saved.refreshingId;
      if (refreshing && store.run(refreshing).conversationId === id)
        throw new WorkbenchError('CONFLICT', '请等待此会话的收藏刷新完成');
      store.deleteConversation(id);
      if (controller.analysis.task?.conversationId === id) controller.analysis.task = null;
      controller.change();
    },
    reparseData: (id) => controller.datasets.reparseData(id),
    touchData: (id) => {
      store.touchDataset(id);
      controller.change();
    },
    preview: (id, table, options) => controller.datasets.preview(id, table, options),
    tableDetails: (id, table) => controller.datasets.tableDetails(id, table),
    semantic: (id, text, metrics) => controller.datasets.semantic(id, text, metrics),
    analyze: (...args: Parameters<API['analyze']>) => controller.analysis.analyze(...args),
    cancel: () => controller.analysis.cancel(),
    clearHistory: () => controller.analysis.clearHistory(),
    removeSavedAnalysis: (id) => controller.saved.remove(id),
    renameSavedAnalysis: (id, title) => controller.saved.rename(id, title),
    refreshSavedAnalysis: (id) => controller.saved.refresh(id),
    chartHTML: (id, theme, saved) => controller.saved.chartHTML(id, theme, saved),
    saveAnalysis: (id) => {
      store.saveAnalysis(id);
      controller.change();
    },
    exportConversation: async (runIds, taskId, format) => {
      const runs = [...new Set(runIds)].map((id) => store.run(id));
      const task =
        taskId === controller.analysis.task?.id
          ? structuredClone(controller.analysis.task)
          : taskId
            ? store.taskRecord(taskId)
            : null;
      if (taskId && !task) throw new WorkbenchError('INVALID_INPUT', '任务记录已不存在，请重新打开会话');
      if (!runs.length && !task) throw new WorkbenchError('INVALID_INPUT', '此会话暂无可导出的分析记录');
      const theme = store.theme();
      const content =
        format === 'html'
          ? await conversationHTML(runs, task || null, theme)
          : conversationMarkdown(runs, task || null);
      const dest = await dialog.showSaveDialog(win, {
        defaultPath: exportFilename('Sive-分析会话', format),
        filters: [
          { name: format === 'html' ? 'HTML（离线图表）' : 'Markdown（含图表配置）', extensions: [format] },
        ],
      });
      if (dest.canceled || !dest.filePath) return false;
      const temporary = `${dest.filePath}.${randomUUID()}.tmp`;
      try {
        fs.writeFileSync(temporary, content, { mode: 0o600 });
        fs.renameSync(temporary, dest.filePath);
      } finally {
        fs.rmSync(temporary, { force: true });
      }
      return true;
    },
    exportAnalysis: async (id, format) => {
      const run = store.run(id);
      const theme = store.theme();
      const html = await analysisHTML(run, theme);
      const dest = await dialog.showSaveDialog(win, {
        defaultPath: exportFilename(run.question, format),
        filters: [{ name: format.toUpperCase(), extensions: [format] }],
      });
      if (dest.canceled || !dest.filePath) return false;
      if (format === 'html') fs.writeFileSync(dest.filePath, html);
      else {
        const print = new BrowserWindow({
          show: false,
          width: 1120,
          height: 900,
          webPreferences: {
            sandbox: true,
            contextIsolation: true,
            nodeIntegration: false,
            backgroundThrottling: false,
          },
        });
        const previewFile = path.join(root, `export-${randomUUID()}.html`);
        try {
          fs.writeFileSync(previewFile, html, { mode: 0o600 });
          await print.loadFile(previewFile);
          let ready = false;
          for (let i = 0; i < 40; i++) {
            const status = await print.webContents.executeJavaScript('window.analysisReady()');
            if (status === 'error')
              throw new WorkbenchError('INVALID_INPUT', '图表未能渲染，请重新分析或导出计算数据。');
            if (status === 'ready') {
              ready = true;
              break;
            }
            await new Promise((r) => setTimeout(r, 250));
          }
          if (!ready) throw new WorkbenchError('INVALID_INPUT', '图表渲染超时，请重试导出。');
          if (format === 'pdf') {
            const pdf = await print.webContents.printToPDF({ printBackground: true, pageSize: 'A4' });
            fs.writeFileSync(dest.filePath, pdf);
          } else {
            const height = Math.ceil(
              await print.webContents.executeJavaScript('document.documentElement.scrollHeight'),
            );
            print.setContentSize(1120, height);
            await new Promise((r) => setTimeout(r, 600));
            const image = await print.webContents.capturePage();
            fs.writeFileSync(dest.filePath, image.toPNG());
          }
        } finally {
          print.destroy();
          fs.rmSync(previewFile, { force: true });
        }
      }
      return true;
    },
    listModels: (input) => models.list(input),
    saveModel: async (input) => {
      await models.save(input, (progress) => {
        if (win && !win.isDestroyed()) win.webContents.send('workbench:model-test', progress);
      });
      controller.change();
    },
    activateModel: (id, model) => {
      models.activate(id, model);
      controller.change();
    },
    deleteModel: (id) => {
      models.delete(id);
      controller.change();
    },
  };
  for (const name of commandNames)
    ipcMain.handle('workbench:' + name, async (event, ...args: unknown[]) => {
      try {
        if (event.sender !== win.webContents || event.senderFrame !== win.webContents.mainFrame)
          throw new WorkbenchError('INVALID_INPUT', '不允许的调用');
        return { ok: true, value: await invokeCommand(methods, name, args) };
      } catch (error) {
        return failure(error);
      }
    });
  if (dev) void win.loadURL(dev);
  else void win.loadFile(path.join(__dirname, '../dist/index.html'));
  app.on('before-quit', () => controller.analysis.cancel());
});
app.on('window-all-closed', () => app.quit());
