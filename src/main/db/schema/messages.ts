import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { conversations } from './conversations';

export const messages = sqliteTable('messages', {
  // Unique identifier of the message.
  id: text('id').primaryKey(),

  // Identifier of the conversation that owns the message.
  conversationId: text('conversation_id')
    .notNull()
    .references(() => conversations.id, { onDelete: 'cascade' }),

  // Zero-based append sequence number within the conversation.
  sequence: integer('sequence').notNull(),

  // Role of the message author.
  role: text('role', { enum: ['user', 'assistant'] }).notNull(),

  // Current generation status of the message.
  status: text('status', {
    enum: ['running', 'cancelling', 'done', 'error', 'cancelled', 'interrupted'],
  }).notNull(),

  // JSON object containing the message body, analysis results, and process information.
  content: text('content').notNull(),

  // JSON object containing the AVA options snapshot without credentials.
  analysisOptions: text('analysis_options').notNull().default('{}'),

  // Creation timestamp.
  createdAt: text('created_at').notNull(),

  // Timestamp of the last progress, terminal-state, or soft deletion update.
  updatedAt: text('updated_at').notNull(),

  // Soft deletion timestamp.
  deletedAt: text('deleted_at'),
});
