import { and, desc, eq, isNull } from 'drizzle-orm';
import { snippets } from '../schema';
import type { DbService } from '../DbService';
import { timestamp } from '../../utils/repository';

type SnippetInsert = typeof snippets.$inferInsert;
type SnippetUpdate = Partial<Omit<SnippetInsert, 'id' | 'createdAt'>>;

export class SnippetRepo {
  constructor(private database: DbService) {}

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

  insert(values: SnippetInsert | SnippetInsert[]) {
    this.db
      .insert(snippets)
      .values(Array.isArray(values) ? values : [values])
      .run();
  }

  update(id: string, values: SnippetUpdate) {
    this.db
      .update(snippets)
      .set({ ...values, updatedAt: values.updatedAt ?? timestamp() })
      .where(and(eq(snippets.id, id), isNull(snippets.deletedAt)))
      .run();
  }

  remove(id: string) {
    const row = this.get(id);
    if (!row) return;
    const now = timestamp(row.updatedAt);
    this.update(id, { deletedAt: now, updatedAt: now });
  }
}
