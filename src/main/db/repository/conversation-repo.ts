import { and, desc, eq, isNotNull, isNull } from 'drizzle-orm';
import { conversations } from '../schema';
import type { ConversationInsert, ConversationUpdate } from '../schema';
import type { DBConnection } from './db-connection';

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

  updateTitleIfCurrent(id: string, currentTitle: string, title: string) {
    const result = this.db
      .update(conversations)
      .set({ title })
      .where(
        and(eq(conversations.id, id), eq(conversations.title, currentTitle), isNull(conversations.deletedAt)),
      )
      .run();
    return result.changes > 0;
  }

  remove(id: string) {
    this.db.delete(conversations).where(eq(conversations.id, id)).run();
  }
}
