import { and, eq, inArray, isNull } from 'drizzle-orm';
import { messages, snippets } from '../schema';
import type { DbService } from '../DbService';
import { timestamp } from '../../utils/time';

type SnippetInsert = typeof snippets.$inferInsert;
type SnippetUpdate = Partial<Omit<SnippetInsert, 'id' | 'createdAt'>>;

export class SnippetRepo {
  constructor(private database: DbService) {}

  private get db() {
    return this.database.connection;
  }

  getByMessageId(messageId: string) {
    return this.db
      .select()
      .from(snippets)
      .where(and(eq(snippets.messageId, messageId), isNull(snippets.deletedAt)))
      .get();
  }

  insert(values: SnippetInsert) {
    return this.db.insert(snippets).values(values).returning().get();
  }

  update(id: string, values: SnippetUpdate) {
    return this.db
      .update(snippets)
      .set({ ...values, updatedAt: values.updatedAt ?? timestamp() })
      .where(and(eq(snippets.id, id), isNull(snippets.deletedAt)))
      .returning()
      .get();
  }

  purgeConversation(conversationId: string) {
    this.db
      .delete(snippets)
      .where(
        inArray(
          snippets.messageId,
          this.db
            .select({ id: messages.id })
            .from(messages)
            .where(eq(messages.conversationId, conversationId)),
        ),
      )
      .run();
  }
}
