import { and, desc, eq, isNull } from 'drizzle-orm';
import { datasets } from '../schema';
import type { DBConnection } from './db-connection';

type DatasetInsert = typeof datasets.$inferInsert;
type DatasetUpdate = Partial<Omit<DatasetInsert, 'id' | 'createdAt'>>;

export class DatasetRepo {
  constructor(private database: DBConnection) {}

  private get db() {
    return this.database.connection;
  }

  get(id: string) {
    return this.db
      .select()
      .from(datasets)
      .where(and(eq(datasets.id, id), isNull(datasets.deletedAt)))
      .get();
  }

  list() {
    return this.db
      .select()
      .from(datasets)
      .where(isNull(datasets.deletedAt))
      .orderBy(desc(datasets.updatedAt), desc(datasets.id))
      .all();
  }

  insert(values: DatasetInsert) {
    return this.db.insert(datasets).values(values).returning().get();
  }

  update(id: string, values: DatasetUpdate) {
    return this.db
      .update(datasets)
      .set({ ...values, updatedAt: values.updatedAt ?? new Date().toISOString() })
      .where(and(eq(datasets.id, id), isNull(datasets.deletedAt)))
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
