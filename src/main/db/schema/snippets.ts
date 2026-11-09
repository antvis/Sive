import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { messages } from './messages';
import { timestamps } from './timestamps';

export const snippets = sqliteTable('snippets', {
  id: text('id').primaryKey(),
  message_id: text('message_id')
    .notNull()
    .unique()
    .references(() => messages.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  content: text('content').notNull(),
  is_visible: integer('is_visible').notNull().default(0),
  ...timestamps(),
});
