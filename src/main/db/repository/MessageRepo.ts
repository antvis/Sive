import { and, desc, eq, getTableColumns, inArray, isNull, ne, sql, type SQL } from 'drizzle-orm';
import { alias } from 'drizzle-orm/sqlite-core';
import { conversations, messages, snippets } from '../schema';
import type { DbService } from '../DbService';
import { timestamp } from '../../utils/time';

type MessageInsert = typeof messages.$inferInsert;
type MessageUpdate = Partial<Omit<MessageInsert, 'id' | 'createdAt'>>;

const users = alias(messages, 'user_message');
const question = sql<string>`json_extract(${users.content}, '$.text')`;
const precedingUser = and(
  eq(users.conversationId, messages.conversationId),
  eq(users.sequence, sql`${messages.sequence} - 1`),
  eq(users.role, 'user'),
);
const assistant = and(eq(messages.role, 'assistant'), isNull(messages.deletedAt));

export class MessageRepo {
  constructor(private database: DbService) {}

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

  list() {
    return this.db
      .select()
      .from(messages)
      .where(isNull(messages.deletedAt))
      .orderBy(desc(messages.createdAt), desc(messages.id))
      .all();
  }

  listByConversationId(conversationId: string) {
    return this.db
      .select()
      .from(messages)
      .where(and(eq(messages.conversationId, conversationId), isNull(messages.deletedAt)))
      .orderBy(messages.sequence)
      .all();
  }

  listIdsByConversationId(conversationId: string) {
    return this.db
      .select({ id: messages.id })
      .from(messages)
      .where(eq(messages.conversationId, conversationId))
      .all()
      .map((row) => row.id);
  }

  insert(values: MessageInsert) {
    return this.db.insert(messages).values(values).returning().get();
  }

  update(id: string, values: MessageUpdate) {
    return this.db
      .update(messages)
      .set({ ...values, updatedAt: values.updatedAt ?? timestamp() })
      .where(and(eq(messages.id, id), isNull(messages.deletedAt)))
      .returning()
      .get();
  }

  remove(id: string) {
    this.db.delete(messages).where(eq(messages.id, id)).run();
  }

  private analysisQuery(filter?: SQL) {
    return this.db
      .select({ ...getTableColumns(messages), datasetId: conversations.datasetId, question })
      .from(messages)
      .innerJoin(conversations, eq(conversations.id, messages.conversationId))
      .innerJoin(users, precedingUser)
      .where(and(assistant, isNull(conversations.deletedAt), filter));
  }

  getAnalysis(id: string) {
    return this.analysisQuery(eq(messages.id, id)).get();
  }

  recentAnalyses(conversationId: string, limit: number) {
    return this.analysisQuery(and(eq(messages.conversationId, conversationId), eq(messages.status, 'done')))
      .orderBy(desc(messages.sequence))
      .limit(limit)
      .all()
      .reverse();
  }

  listAnalysesByStatus(statuses: MessageInsert['status'][]) {
    return this.analysisQuery(inArray(messages.status, statuses)).all();
  }

  listTasks() {
    return this.analysisQuery(and(ne(messages.status, 'done'), isNull(conversations.archivedAt)))
      .orderBy(desc(messages.createdAt), desc(messages.sequence))
      .all();
  }

  listRuns() {
    return this.db
      .select({
        id: messages.id,
        conversationId: messages.conversationId,
        datasetId: conversations.datasetId,
        sequence: messages.sequence,
        analysisOptions: messages.analysisOptions,
        updatedAt: messages.updatedAt,
        question,
        snippetUpdatedAt: snippets.updatedAt,
        snippetTitle: snippets.title,
      })
      .from(messages)
      .innerJoin(conversations, eq(conversations.id, messages.conversationId))
      .innerJoin(users, precedingUser)
      .leftJoin(
        snippets,
        and(eq(snippets.messageId, messages.id), eq(snippets.isVisible, 1), isNull(snippets.deletedAt)),
      )
      .where(
        and(
          assistant,
          eq(messages.status, 'done'),
          isNull(conversations.archivedAt),
          isNull(conversations.deletedAt),
        ),
      )
      .orderBy(desc(messages.createdAt), desc(messages.sequence))
      .all();
  }

  latestAnalysisId(conversationId: string, status: MessageInsert['status']) {
    return this.db
      .select({ id: messages.id })
      .from(messages)
      .where(and(assistant, eq(messages.conversationId, conversationId), eq(messages.status, status)))
      .orderBy(desc(messages.sequence))
      .limit(1)
      .get()?.id;
  }

  hasStatus(conversationId: string, statuses: MessageInsert['status'][]) {
    return !!this.db
      .select({ id: messages.id })
      .from(messages)
      .where(
        and(
          eq(messages.conversationId, conversationId),
          inArray(messages.status, statuses),
          isNull(messages.deletedAt),
        ),
      )
      .get();
  }

  nextSequence(conversationId: string) {
    return this.db
      .select({ next: sql<number>`coalesce(max(${messages.sequence}) + 1, 0)` })
      .from(messages)
      .where(eq(messages.conversationId, conversationId))
      .get()!.next;
  }

  listConversationIds(conversationIds: string[]) {
    return this.db
      .selectDistinct({ id: messages.conversationId })
      .from(messages)
      .where(inArray(messages.conversationId, conversationIds))
      .all()
      .map((row) => row.id);
  }

  insertMany(values: MessageInsert[]) {
    return this.db.insert(messages).values(values).returning().all();
  }
}
