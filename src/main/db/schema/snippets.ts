import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { messages } from './messages';

export const snippets = sqliteTable('snippets', {
  // Unique identifier of the snippet.
  id: text('id').primaryKey(),

  // Identifier of the source assistant message.
  // Each message can have at most one snippet.
  messageId: text('message_id')
    .notNull()
    .unique()
    .references(() => messages.id, { onDelete: 'cascade' }),

  // Title of the snippet.
  title: text('title').notNull(),

  // JSON object containing the presentation snapshot.
  content: text('content').notNull(),

  // Whether the snippet is visible in the saved list, stored as 0 or 1.
  isVisible: integer('is_visible').notNull().default(0),

  // Timestamp when the snippet was generated after the reply completed.
  createdAt: text('created_at').notNull(),

  // Timestamp of the last save, visibility, rename, refresh, or soft deletion update.
  updatedAt: text('updated_at').notNull(),

  // Soft deletion timestamp.
  deletedAt: text('deleted_at'),
});
