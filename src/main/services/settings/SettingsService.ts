import type { DbService } from '../../db/DbService';
import type { SettingRepo } from '../../db/repository/SettingRepo';
import { defaultTheme, validateTheme, type ThemeSettings } from '@shared/theme';
import { timestamp } from '../../utils/time';

export class SettingsService {
  constructor(
    private database: DbService,
    private records: SettingRepo,
    private change: () => void,
  ) {}

  private get<T>(key: string): T | undefined {
    return this.records.get(key)?.value as T | undefined;
  }

  private set(key: string, value: unknown) {
    this.database.write(() => {
      const now = timestamp();
      if (!this.records.update(key, { value, updatedAt: now }))
        this.records.insert({ key, value, createdAt: now, updatedAt: now });
    });
  }

  get lastImportDirectory() {
    return this.get<string>('last_import_directory');
  }

  theme() {
    return validateTheme(this.get<ThemeSettings>('theme') ?? defaultTheme);
  }

  saveTheme(theme: ThemeSettings) {
    this.set('theme', validateTheme(theme));
    this.change();
  }

  rememberImportDirectory(directory: string) {
    this.set('last_import_directory', directory);
  }
}
