import { and, eq, isNull } from 'drizzle-orm';
import { modelProviders } from '../schema';
import type { DbService } from '../DbService';
import { timestamp } from '../../utils/repository';

type ModelProviderInsert = typeof modelProviders.$inferInsert;
type ModelProviderUpdate = Partial<Omit<ModelProviderInsert, 'id' | 'createdAt'>>;

export class ModelProviderRepo {
  constructor(private database: DbService) {}

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

  insert(values: ModelProviderInsert | ModelProviderInsert[]) {
    this.db
      .insert(modelProviders)
      .values(Array.isArray(values) ? values : [values])
      .run();
  }

  update(id: string, values: ModelProviderUpdate) {
    this.db
      .update(modelProviders)
      .set({ ...values, updatedAt: values.updatedAt ?? timestamp() })
      .where(and(eq(modelProviders.id, id), isNull(modelProviders.deletedAt)))
      .run();
  }

  remove(id: string) {
    const row = this.get(id);
    if (!row) return;
    const now = timestamp(row.updatedAt);
    this.update(id, { deletedAt: now, updatedAt: now });
  }
}
