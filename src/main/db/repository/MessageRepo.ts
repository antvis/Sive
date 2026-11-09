import { and, desc, eq, isNull } from 'drizzle-orm';
import { messages } from '../schema';
import type { DbService } from '../DbService';
import { timestamp } from '../../utils/repository';

type MessageInsert = typeof messages.$inferInsert;
type MessageUpdate = Partial<Omit<MessageInsert, 'id' | 'createdAt'>>;

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
    const row = this.get(id);
    if (!row) return;
    const now = timestamp(row.updatedAt);
    this.update(id, { deletedAt: now, updatedAt: now });
  }
}
