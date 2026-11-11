import { and, asc, desc, eq, isNull, sql } from 'drizzle-orm';
import { messages } from '../schema';
import type { DBConnection } from './db-connection';

type MessageInsert = typeof messages.$inferInsert;

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

  getUserBefore(conversationId: string, sequence: number) {
    return this.db
      .select()
      .from(messages)
      .where(
        and(
          eq(messages.conversationId, conversationId),
          eq(messages.sequence, sequence - 1),
          eq(messages.role, 'user'),
          isNull(messages.deletedAt),
        ),
      )
      .get();
  }

  listRuns() {
    return this.db
      .select()
      .from(messages)
      .where(and(eq(messages.role, 'assistant'), eq(messages.status, 'done'), isNull(messages.deletedAt)))
      .orderBy(desc(messages.createdAt), desc(messages.id))
      .all();
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

  removeByConversationId(conversationId: string) {
    this.db.delete(messages).where(eq(messages.conversationId, conversationId)).run();
  }
}
