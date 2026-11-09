import { nativeTheme, type BrowserWindow } from 'electron';
import type { CommandHandlers } from '@shared/commands';
import type { WorkbenchServices } from '../../services';
import { themePalette } from '@shared/theme';

export function createSettingsHandlers(
  win: BrowserWindow,
  settings: WorkbenchServices['settings'],
): Pick<CommandHandlers, 'settingsSaveTheme'> {
  return {
    settingsSaveTheme: (theme) => {
      settings.saveTheme(theme);
      nativeTheme.themeSource = settings.theme().mode;
      win.setBackgroundColor(themePalette(settings.theme()).background);
    },
  };
}
