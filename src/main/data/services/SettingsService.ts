import { and, eq, isNull } from 'drizzle-orm';
import { settings } from '@main/data/db/schema';
import { parseJSON } from '@main/data/mappers';
import { defaultTheme, validateTheme, type ThemeSettings } from '@shared/theme';
import type { DbService } from '@main/data/db/DbService';
import { timestamp } from './utils';

export class SettingsService {
  constructor(private database: DbService) {}
  private get db() {
    return this.database.connection;
  }
  get<T>(key: string): T | undefined {
    const row = this.db
      .select({ value: settings.value })
      .from(settings)
      .where(and(eq(settings.key, key), isNull(settings.deleted_at)))
      .get();
    return row ? parseJSON<T>(row.value) : undefined;
  }
  set(key: string, value: unknown) {
    this.database.write(() => {
      const now = timestamp();
      const encoded = JSON.stringify(value);
      this.db
        .insert(settings)
        .values({ key, value: encoded, created_at: now, updated_at: now })
        .onConflictDoUpdate({
          target: settings.key,
          set: { value: encoded, updated_at: now, deleted_at: null },
        })
        .run();
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
  }
  rememberImportDirectory(directory: string) {
    this.set('last_import_directory', directory);
  }
}
