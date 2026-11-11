import { and, desc, eq, isNotNull, isNull } from 'drizzle-orm';
import { conversations } from '../schema';
import type { DBConnection } from './db-connection';

type ConversationInsert = typeof conversations.$inferInsert;
type ConversationUpdate = Partial<Omit<ConversationInsert, 'id' | 'createdAt'>>;

export class ConversationRepo {
  constructor(private database: DBConnection) {}

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
      .where(and(isNull(conversations.deletedAt), isNull(conversations.archivedAt)))
      .orderBy(desc(conversations.createdAt), desc(conversations.id))
      .all();
  }

  listArchived() {
    return this.db
      .select()
      .from(conversations)
      .where(and(isNull(conversations.deletedAt), isNotNull(conversations.archivedAt)))
      .orderBy(desc(conversations.archivedAt), desc(conversations.id))
      .all();
  }

  listByDatasetId(datasetId: string) {
    return this.db
      .select()
      .from(conversations)
      .where(
        and(
          eq(conversations.datasetId, datasetId),
          isNull(conversations.deletedAt),
          isNull(conversations.archivedAt),
        ),
      )
      .orderBy(desc(conversations.createdAt), desc(conversations.id))
      .all();
  }

  insert(values: ConversationInsert) {
    return this.db.insert(conversations).values(values).returning().get();
  }

  update(id: string, values: ConversationUpdate) {
    return this.db
      .update(conversations)
      .set({ ...values, updatedAt: values.updatedAt ?? new Date().toISOString() })
      .where(and(eq(conversations.id, id), isNull(conversations.deletedAt)))
      .returning()
      .get();
  }

  remove(id: string) {
    this.db.delete(conversations).where(eq(conversations.id, id)).run();
  }
}
