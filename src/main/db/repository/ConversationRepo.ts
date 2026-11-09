import { and, desc, eq, isNull } from 'drizzle-orm';
import { conversations } from '../schema';
import type { DbService } from '../DbService';
import { timestamp } from '../../utils/repository';

type ConversationInsert = typeof conversations.$inferInsert;
type ConversationUpdate = Partial<Omit<ConversationInsert, 'id' | 'createdAt'>>;

export class ConversationRepo {
  constructor(private database: DbService) {}

  private get db() {
    return this.database.connection;
  }

  get(id: string) {
    return this.db
      .select()
      .from(conversations)
      .where(and(eq(conversations.id, id), isNull(conversations.deletedAt)))
      .get();
  }

  list() {
    return this.db
      .select()
      .from(conversations)
      .where(isNull(conversations.deletedAt))
      .orderBy(desc(conversations.createdAt), desc(conversations.id))
      .all();
  }

  listByDatasetId(datasetId: string) {
    return this.db
      .select()
      .from(conversations)
      .where(and(eq(conversations.datasetId, datasetId), isNull(conversations.deletedAt)))
      .orderBy(desc(conversations.createdAt), desc(conversations.id))
      .all();
  }

  insert(values: ConversationInsert) {
    return this.db.insert(conversations).values(values).returning().get();
  }

  update(id: string, values: ConversationUpdate) {
    return this.db
      .update(conversations)
      .set({ ...values, updatedAt: values.updatedAt ?? timestamp() })
      .where(and(eq(conversations.id, id), isNull(conversations.deletedAt)))
      .returning()
      .get();
  }

  remove(id: string) {
    const row = this.get(id);
    if (!row) return;
    const now = timestamp(row.updatedAt);
    this.update(id, { deletedAt: now, updatedAt: now });
  }
}
