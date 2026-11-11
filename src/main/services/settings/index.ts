import type { Repositories } from '../../db/repository';
import type { DBConnection } from '../../db/repository/DBConnection';
import type { ActiveModel } from '../../db/repository/SettingRepo';
import type { ThemeSettings } from '../types';

const THEME_KEY = 'theme';

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

  getActiveModel(): ActiveModel {
    return this.repositories.settings.getActiveModel();
  }

  saveActiveModel(value: ActiveModel) {
    this.repositories.settings.saveActiveModel(value);
  }
}
