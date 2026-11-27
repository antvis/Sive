import { app, Menu } from 'electron';
import type { MenuItemConstructorOptions } from 'electron';
import { i18n } from './util/i18n';
import { openAppWindow } from './windows';

export function updateApplicationMenu() {
  const mac = process.platform === 'darwin';
  const settings: MenuItemConstructorOptions = {
    label: i18n('settings.title'),
    accelerator: 'CmdOrCtrl+,',
    click: () => {
      void openAppWindow('settings');
    },
  };
  const template: MenuItemConstructorOptions[] = [];
  if (mac) {
    template.push({
      label: app.name,
      submenu: [
        { role: 'about', label: i18n('settings.pages.about.title') },
        { type: 'separator' },
        settings,
        { type: 'separator' },
        { role: 'services', label: i18n('menu.app.services') },
        { type: 'separator' },
        { role: 'hide', label: i18n('menu.app.hide') },
        { role: 'hideOthers', label: i18n('menu.app.hideOthers') },
        { role: 'unhide', label: i18n('menu.app.showAll') },
        { type: 'separator' },
        { role: 'quit', label: i18n('menu.app.quit') },
      ],
    });
  }
  template.push(
    {
      label: i18n('menu.file.title'),
      submenu: mac
        ? [{ role: 'close', label: i18n('menu.file.closeWindow') }]
        : [settings, { type: 'separator' }, { role: 'quit', label: i18n('menu.app.quit') }],
    },
    {
      label: i18n('menu.edit.title'),
      submenu: [
        { role: 'undo', label: i18n('menu.edit.undo') },
        { role: 'redo', label: i18n('menu.edit.redo') },
        { type: 'separator' },
        { role: 'cut', label: i18n('menu.edit.cut') },
        { role: 'copy', label: i18n('common.actions.copy') },
        { role: 'paste', label: i18n('menu.edit.paste') },
        { role: 'pasteAndMatchStyle', label: i18n('menu.edit.pasteAndMatchStyle') },
        { role: 'delete', label: i18n('common.actions.delete') },
        { role: 'selectAll', label: i18n('menu.edit.selectAll') },
      ],
    },
    {
      label: i18n('menu.view.title'),
      submenu: [
        { role: 'reload', label: i18n('common.actions.reload') },
        { role: 'forceReload', label: i18n('menu.view.forceReload') },
        { role: 'toggleDevTools', label: i18n('menu.view.developerTools') },
        { type: 'separator' },
        { role: 'resetZoom', label: i18n('menu.view.actualSize') },
        { role: 'zoomIn', label: i18n('common.actions.zoomIn') },
        { role: 'zoomOut', label: i18n('common.actions.zoomOut') },
        { type: 'separator' },
        { role: 'togglefullscreen', label: i18n('menu.view.toggleFullscreen') },
      ],
    },
    {
      label: i18n('menu.window.title'),
      submenu: [
        { role: 'minimize', label: i18n('menu.window.minimize') },
        { role: 'zoom', label: i18n('menu.window.zoom') },
        ...(mac
          ? [
              { type: 'separator' as const },
              { role: 'front' as const, label: i18n('menu.window.bringAllToFront') },
            ]
          : []),
      ],
    },
  );
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}
