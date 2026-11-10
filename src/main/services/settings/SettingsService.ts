import type { DbService } from '../../db/DbService';
import type { SettingRepo } from '../../db/repository/SettingRepo';
import { defaultTheme, type ThemeSettings } from '@shared/theme';
import { themeSchema } from '@shared/inputSchemas';
import { parseInput } from '../../utils/input';
import { timestamp } from '../../utils/time';

export class SettingsService {
  constructor(
    private database: DbService,
    private records: SettingRepo,
    private change: () => void,
  ) {}

  private get(key: string) {
    return this.records.get(key)?.value;
  }

  private set(key: string, value: unknown) {
    this.database.write(() => {
      const now = timestamp();
      if (!this.records.update(key, { value, updatedAt: now }))
        this.records.insert({ key, value, createdAt: now, updatedAt: now });
    });
  }

  get lastImportDirectory() {
    const value = this.get('last_import_directory');
    return typeof value === 'string' ? value : undefined;
  }

  theme() {
    return parseInput(themeSchema, this.get('theme') ?? defaultTheme);
  }

  saveTheme(theme: ThemeSettings) {
    this.set('theme', parseInput(themeSchema, theme));
    this.change();
  }

  rememberImportDirectory(directory: string) {
    this.set('last_import_directory', directory);
  }
}
