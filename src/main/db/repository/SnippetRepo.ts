import { and, desc, eq, inArray, isNull } from 'drizzle-orm';
import { snippets } from '../schema';
import type { DBConnection } from './DBConnection';

type SnippetInsert = typeof snippets.$inferInsert;
type SnippetUpdate = Partial<Omit<SnippetInsert, 'id' | 'createdAt'>>;

export class SnippetRepo {
  constructor(private database: DBConnection) {}

  private get db() {
    return this.database.connection;
  }

  get(id: string) {
    return this.db
      .select()
      .from(snippets)
      .where(and(eq(snippets.id, id), isNull(snippets.deletedAt)))
      .get();
  }

  getByMessageId(messageId: string) {
    return this.db
      .select()
      .from(snippets)
      .where(and(eq(snippets.messageId, messageId), isNull(snippets.deletedAt)))
      .get();
  }

  list() {
    return this.db
      .select()
      .from(snippets)
      .where(isNull(snippets.deletedAt))
      .orderBy(desc(snippets.updatedAt), desc(snippets.id))
      .all();
  }

  listIdsByMessageIds(messageIds: string[]) {
    if (!messageIds.length) return [];
    return this.db
      .select({ id: snippets.id })
      .from(snippets)
      .where(and(inArray(snippets.messageId, messageIds), isNull(snippets.deletedAt)))
      .all()
      .map((row) => row.id);
  }

  insert(values: SnippetInsert) {
    return this.db.insert(snippets).values(values).returning().get();
  }

  update(id: string, values: SnippetUpdate) {
    return this.db
      .update(snippets)
      .set({ ...values, updatedAt: values.updatedAt ?? new Date().toISOString() })
      .where(and(eq(snippets.id, id), isNull(snippets.deletedAt)))
      .returning()
      .get();
  }

  remove(id: string) {
    this.db.delete(snippets).where(eq(snippets.id, id)).run();
  }
}
