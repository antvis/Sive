import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { conversations } from './conversations';
import { timestamps } from './timestamps';

export const messages = sqliteTable('messages', {
  id: text('id').primaryKey(),
  conversation_id: text('conversation_id')
    .notNull()
    .references(() => conversations.id, { onDelete: 'cascade' }),
  sequence: integer('sequence').notNull(),
  role: text('role', { enum: ['user', 'assistant'] }).notNull(),
  status: text('status', {
    enum: ['running', 'cancelling', 'done', 'error', 'cancelled', 'interrupted'],
  }).notNull(),
  content: text('content').notNull(),
  analysis_options: text('analysis_options').notNull().default('{}'),
  ...timestamps(),
});
