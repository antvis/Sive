import { and, eq, isNull } from 'drizzle-orm';
import { settings } from '../schema';
import type { DbService } from '../DbService';
import { timestamp } from '../../utils/time';

type SettingInsert = typeof settings.$inferInsert;
type SettingUpdate = Partial<Omit<SettingInsert, 'key' | 'createdAt'>>;

export class SettingRepo {
  constructor(private database: DbService) {}

  private get db() {
    return this.database.connection;
  }

  get(key: string) {
    return this.db
      .select()
      .from(settings)
      .where(and(eq(settings.key, key), isNull(settings.deletedAt)))
      .get();
  }

  list() {
    return this.db.select().from(settings).where(isNull(settings.deletedAt)).orderBy(settings.key).all();
  }

  insert(values: SettingInsert) {
    return this.db.insert(settings).values(values).returning().get();
  }

  update(key: string, values: SettingUpdate) {
    return this.db
      .update(settings)
      .set({ ...values, updatedAt: values.updatedAt ?? timestamp() })
      .where(and(eq(settings.key, key), isNull(settings.deletedAt)))
      .returning()
      .get();
  }

  remove(key: string) {
    const row = this.get(key);
    if (!row) return;
    const now = timestamp(row.updatedAt);
    this.update(key, { deletedAt: now, updatedAt: now });
  }
}
