import { integer, sqliteTable, text, unique } from 'drizzle-orm/sqlite-core';
import type { ChatMessage } from '@shared/api';
import type { AnalysisOptions } from '@shared/schema';

export const messages = sqliteTable(
  'messages',
  {
    // Unique identifier of the message.
    id: text('id').primaryKey(),

    // Logical foreign key: conversations.id.
    conversationId: text('conversation_id').notNull(),

    // Non-negative, zero-based append sequence number within the conversation.
    sequence: integer('sequence').notNull(),

    // Role of the message author: user or assistant.
    role: text('role', { enum: ['user', 'assistant'] }).notNull(),

    // AI SDK UI message parts, including text and tool calls.
    parts: text('parts', { mode: 'json' }).$type<ChatMessage['parts']>().notNull(),

    // Snapshot of the analysis strategy and model, without credentials.
    analysisOptions: text('analysis_options', { mode: 'json' })
      .$type<AnalysisOptions>()
      .notNull()
      .default({}),

    // Creation timestamp.
    createdAt: text('created_at').notNull(),

    // Last modification timestamp.
    updatedAt: text('updated_at').notNull(),

    // Soft deletion timestamp.
    deletedAt: text('deleted_at'),
  },
  (table) => [unique('messages_conversation_sequence_unique').on(table.conversationId, table.sequence)],
);

export type MessageRow = typeof messages.$inferSelect;

export type MessageInsert = typeof messages.$inferInsert;

export type MessageUpdate = Partial<Omit<MessageInsert, 'id' | 'conversationId' | 'sequence' | 'createdAt'>>;
