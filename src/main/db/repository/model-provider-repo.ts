import { and, eq, isNull } from 'drizzle-orm';
import { modelProviders } from '../schema';
import type { DBConnection } from './db-connection';

type ModelProviderInsert = typeof modelProviders.$inferInsert;
type ModelProviderUpdate = Partial<Omit<ModelProviderInsert, 'id' | 'createdAt'>>;

export class ModelProviderRepo {
  constructor(private database: DBConnection) {}

  private get db() {
    return this.database.connection;
  }

  get(id: string) {
    return this.db
      .select()
      .from(modelProviders)
      .where(and(eq(modelProviders.id, id), isNull(modelProviders.deletedAt)))
      .get();
  }

  list() {
    return this.db
      .select()
      .from(modelProviders)
      .where(isNull(modelProviders.deletedAt))
      .orderBy(modelProviders.createdAt, modelProviders.id)
      .all();
  }

  insert(values: ModelProviderInsert) {
    return this.db.insert(modelProviders).values(values).returning().get();
  }

  update(id: string, values: ModelProviderUpdate) {
    return this.db
      .update(modelProviders)
      .set({ ...values, updatedAt: values.updatedAt ?? new Date().toISOString() })
      .where(and(eq(modelProviders.id, id), isNull(modelProviders.deletedAt)))
      .returning()
      .get();
  }

  remove(id: string) {
    const row = this.get(id);
    if (!row) return;
    const now = new Date().toISOString();
    this.update(id, { deletedAt: now, updatedAt: now });
  }
}
