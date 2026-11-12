import { and, asc, eq, isNull, sql } from 'drizzle-orm';
import { messages } from '../schema';
import type { DBConnection } from './db-connection';

type MessageInsert = typeof messages.$inferInsert;
type MessageUpdate = Partial<Omit<MessageInsert, 'id' | 'conversationId' | 'sequence' | 'createdAt'>>;

export class MessageRepo {
  constructor(private database: DBConnection) {}

  private get db() {
    return this.database.connection;
  }

  get(id: string) {
    return this.db
      .select()
      .from(messages)
      .where(and(eq(messages.id, id), isNull(messages.deletedAt)))
      .get();
  }

  listByConversationId(conversationId: string) {
    return this.db
      .select()
      .from(messages)
      .where(and(eq(messages.conversationId, conversationId), isNull(messages.deletedAt)))
      .orderBy(asc(messages.sequence))
      .all();
  }

  nextSequence(conversationId: string) {
    const row = this.db
      .select({ value: sql<number>`COALESCE(MAX(${messages.sequence}) + 1, 0)` })
      .from(messages)
      .where(eq(messages.conversationId, conversationId))
      .get();
    return row?.value ?? 0;
  }

  insert(values: MessageInsert) {
    return this.db.insert(messages).values(values).returning().get();
  }

  update(id: string, values: MessageUpdate) {
    return this.db
      .update(messages)
      .set({ ...values, updatedAt: values.updatedAt ?? new Date().toISOString() })
      .where(and(eq(messages.id, id), isNull(messages.deletedAt)))
      .returning()
      .get();
  }

  removeByConversationId(conversationId: string) {
    this.db.delete(messages).where(eq(messages.conversationId, conversationId)).run();
  }
}
