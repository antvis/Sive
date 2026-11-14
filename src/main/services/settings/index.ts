import type { Repositories } from '../../db/repository';
import type { DBConnection } from '../../db/repository/db-connection';
import type { ActiveModel } from '../../db/repository/setting-repo';
import type { Preferences, ThemeSettings } from '../types';
import { DEFAULT_PREFERENCES, PREVIEW_PAGE_SIZES } from '@shared/api';

const THEME_KEY = 'theme';
const PREFERENCES_KEY = 'preferences';

export class SettingsService {
  constructor(
    private database: DBConnection,
    private repositories: Repositories,
  ) {}

  private set(key: string, value: unknown) {
    const now = new Date().toISOString();
    this.database.write(() => {
      if (this.repositories.settings.get(key))
        this.repositories.settings.update(key, { value, updatedAt: now });
      else this.repositories.settings.insert({ key, value, createdAt: now, updatedAt: now });
    });
  }

  getTheme(): ThemeSettings {
    return (
      (this.repositories.settings.get(THEME_KEY)?.value as ThemeSettings | undefined) ?? { mode: 'light' }
    );
  }

  saveTheme(theme: ThemeSettings) {
    this.set(THEME_KEY, theme);
  }

  getPreferences(): Preferences {
    const saved = this.repositories.settings.get(PREFERENCES_KEY)?.value as Partial<Preferences> | undefined;
    return {
      analysisMode: saved?.analysisMode ?? DEFAULT_PREFERENCES.analysisMode,
      sendShortcut: saved?.sendShortcut ?? DEFAULT_PREFERENCES.sendShortcut,
      previewPageSize:
        PREVIEW_PAGE_SIZES.find((size) => size === saved?.previewPageSize) ??
        DEFAULT_PREFERENCES.previewPageSize,
    };
  }

  savePreferences(preferences: Preferences) {
    if (!PREVIEW_PAGE_SIZES.includes(preferences.previewPageSize)) throw new Error('请选择有效的预览行数。');
    this.set(PREFERENCES_KEY, preferences);
  }

  getActiveModel(): ActiveModel {
    return this.repositories.settings.getActiveModel();
  }

  saveActiveModel(value: ActiveModel) {
    this.repositories.settings.saveActiveModel(value);
  }
}
