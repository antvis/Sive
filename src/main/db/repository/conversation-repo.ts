import { and, desc, eq, getTableColumns, isNotNull, isNull, sql } from 'drizzle-orm';
import { conversations, messages } from '../schema';
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
    return this.withMessages()
      .where(and(isNull(conversations.deletedAt), isNull(conversations.archivedAt)))
      .orderBy(desc(conversations.createdAt), desc(conversations.id))
      .all();
  }

  listArchived() {
    return this.withMessages()
      .where(and(isNull(conversations.deletedAt), isNotNull(conversations.archivedAt)))
      .orderBy(desc(conversations.archivedAt), desc(conversations.id))
      .all();
  }

  private withMessages() {
    const latest = this.db
      .select({
        conversationId: messages.conversationId,
        sequence: sql<number>`MAX(${messages.sequence})`.as('latest_sequence'),
        lastCompletedSequence:
          sql<number>`MAX(CASE WHEN ${messages.status} = 'done' THEN ${messages.sequence} ELSE -1 END)`.as(
            'last_completed_sequence',
          ),
      })
      .from(messages)
      .where(and(eq(messages.role, 'assistant'), isNull(messages.deletedAt)))
      .groupBy(messages.conversationId)
      .as('latest');

    return this.db
      .select({
        ...getTableColumns(conversations),
        latestMessage: { id: messages.id, status: messages.status },
        lastCompletedSequence: sql<number>`COALESCE(${latest.lastCompletedSequence}, -1)`,
      })
      .from(conversations)
      .leftJoin(latest, eq(conversations.id, latest.conversationId))
      .leftJoin(
        messages,
        and(eq(messages.conversationId, conversations.id), eq(messages.sequence, latest.sequence)),
      );
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
