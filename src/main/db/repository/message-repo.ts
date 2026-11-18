import { and, asc, eq, inArray, isNull, sql } from 'drizzle-orm';
import { messages } from '../schema';
import type { MessageInsert, MessageUpdate } from '../schema';
import type { DBConnection } from './db-connection';

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

  listAnalysisSummaries() {
    const latest = this.db
      .select({
        conversationId: messages.conversationId,
        sequence: sql<number>`MAX(${messages.sequence})`.as('latest_sequence'),
        completedSequence:
          sql<number>`MAX(CASE WHEN ${messages.status} = 'done' THEN ${messages.sequence} ELSE -1 END)`.as(
            'completed_sequence',
          ),
      })
      .from(messages)
      .where(and(eq(messages.role, 'assistant'), isNull(messages.deletedAt)))
      .groupBy(messages.conversationId)
      .as('latest');

    return this.db
      .select({
        taskId: messages.id,
        conversationId: messages.conversationId,
        status: messages.status,
        completedSequence: latest.completedSequence,
      })
      .from(messages)
      .innerJoin(
        latest,
        and(eq(messages.conversationId, latest.conversationId), eq(messages.sequence, latest.sequence)),
      )
      .all();
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

  interruptRunning() {
    this.db
      .update(messages)
      .set({ status: 'interrupted', updatedAt: new Date().toISOString() })
      .where(and(inArray(messages.status, ['running', 'cancelling']), isNull(messages.deletedAt)))
      .run();
  }

  removeByConversationId(conversationId: string) {
    this.db.delete(messages).where(eq(messages.conversationId, conversationId)).run();
  }
}
