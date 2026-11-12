import type { Repositories } from '../../db/repository';
import type { DBConnection } from '../../db/repository/db-connection';
import type { ActiveModel } from '../../db/repository/setting-repo';
import type { Preferences, ThemeSettings } from '../types';

const THEME_KEY = 'theme';
const PREFERENCES_KEY = 'preferences';
const defaultPreferences: Preferences = { analysisMode: 'direct', sendShortcut: 'enter' };

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
      analysisMode: saved?.analysisMode ?? defaultPreferences.analysisMode,
      sendShortcut: saved?.sendShortcut ?? defaultPreferences.sendShortcut,
    };
  }

  savePreferences(preferences: Preferences) {
    this.set(PREFERENCES_KEY, preferences);
  }

  getActiveModel(): ActiveModel {
    return this.repositories.settings.getActiveModel();
  }

  saveActiveModel(value: ActiveModel) {
    this.repositories.settings.saveActiveModel(value);
  }
}
