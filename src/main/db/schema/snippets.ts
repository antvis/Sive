import { sql } from 'drizzle-orm';
import type { SnippetContent } from '@shared/schema';
import { index, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const snippets = sqliteTable(
  'snippets',
  {
    // Unique identifier of the snippet.
    id: text('id').primaryKey(),

    // Logical foreign key: messages.id.
    // Each message can have at most one snippet.
    messageId: text('message_id').notNull().unique(),

    // Title of the snippet.
    title: text('title').notNull(),

    // JSON object containing the presentation snapshot.
    content: text('content', { mode: 'json' }).$type<SnippetContent>().notNull(),

    // Timestamp when the snippet was generated after the reply completed.
    createdAt: text('created_at').notNull(),

    // Timestamp of the last save, rename, refresh, or soft deletion update.
    updatedAt: text('updated_at').notNull(),

    // Soft deletion timestamp.
    deletedAt: text('deleted_at'),
  },
  (table) => [index('idx_snippets_list').on(table.deletedAt, sql`${table.updatedAt} DESC`, table.id)],
);

export type SnippetRow = typeof snippets.$inferSelect;

export type SnippetInsert = typeof snippets.$inferInsert;

export type SnippetUpdate = Partial<Omit<SnippetInsert, 'id' | 'createdAt'>>;
