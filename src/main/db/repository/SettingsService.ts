import { and, eq, isNull } from 'drizzle-orm';
import { settings } from '@main/db/schema';
import { defaultTheme, validateTheme, type ThemeSettings } from '@shared/theme';
import type { DbService } from '@main/db/DbService';
import { timestamp } from '@main/utils/repository';

export class SettingsService {
  constructor(private database: DbService) {}
  private get db() {
    return this.database.connection;
  }
  get<T>(key: string): T | undefined {
    const row = this.db
      .select({ value: settings.value })
      .from(settings)
      .where(and(eq(settings.key, key), isNull(settings.deletedAt)))
      .get();
    return row ? (row.value as T) : undefined;
  }
  set(key: string, value: unknown) {
    this.database.write(() => {
      const now = timestamp();
      this.db
        .insert(settings)
        .values({ key, value, createdAt: now, updatedAt: now })
        .onConflictDoUpdate({
          target: settings.key,
          set: { value, updatedAt: now, deletedAt: null },
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
