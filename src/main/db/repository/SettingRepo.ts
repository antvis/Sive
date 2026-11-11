import { and, eq, isNull } from 'drizzle-orm';
import { settings } from '../schema';
import type { DBConnection } from './DBConnection';

type SettingInsert = typeof settings.$inferInsert;
type SettingUpdate = Partial<Omit<SettingInsert, 'key' | 'createdAt'>>;

export type ActiveModel = { providerId: string; model?: string };

const ACTIVE_MODEL_KEY = 'activeModel';

export class SettingRepo {
  constructor(private database: DBConnection) {}

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

  getActiveModel(): ActiveModel {
    return (
      (this.get(ACTIVE_MODEL_KEY)?.value as ActiveModel | undefined) ?? {
        providerId: '',
      }
    );
  }

  saveActiveModel(value: ActiveModel) {
    const now = new Date().toISOString();
    if (this.get(ACTIVE_MODEL_KEY)) this.update(ACTIVE_MODEL_KEY, { value, updatedAt: now });
    else this.insert({ key: ACTIVE_MODEL_KEY, value, createdAt: now, updatedAt: now });
  }

  insert(values: SettingInsert) {
    return this.db.insert(settings).values(values).returning().get();
  }

  update(key: string, values: SettingUpdate) {
    return this.db
      .update(settings)
      .set({ ...values, updatedAt: values.updatedAt ?? new Date().toISOString() })
      .where(and(eq(settings.key, key), isNull(settings.deletedAt)))
      .returning()
      .get();
  }

  remove(key: string) {
    const row = this.get(key);
    if (!row) return;
    const now = new Date().toISOString();
    this.update(key, { deletedAt: now, updatedAt: now });
  }
}
