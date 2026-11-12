import { index, integer, sqliteTable, text, unique } from 'drizzle-orm/sqlite-core';
import type { AnalysisResponse, VisualizeResponse } from '@antv/ava';

export type MessageContent = {
  question?: string;
  stage?: string;
  error?: string;
} & Partial<AnalysisResponse> & { chartHtml?: VisualizeResponse['html'] };

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

    // Current generation status; must be one of the declared enum values.
    status: text('status', {
      enum: ['running', 'cancelling', 'done', 'error', 'cancelled', 'interrupted'],
    }).notNull(),

    // JSON object containing the message body, analysis results, and process information.
    content: text('content', { mode: 'json' }).$type<MessageContent>().notNull(),

    // JSON object containing the AVA options snapshot without credentials.
    analysisOptions: text('analysis_options', { mode: 'json' }).notNull().default({}),

    // Creation timestamp.
    createdAt: text('created_at').notNull(),

    // Timestamp of the last progress, terminal-state, or soft deletion update.
    updatedAt: text('updated_at').notNull(),

    // Soft deletion timestamp.
    deletedAt: text('deleted_at'),
  },
  (table) => [
    unique('messages_conversation_sequence_unique').on(table.conversationId, table.sequence),
    index('idx_messages_status').on(table.status, table.createdAt, table.id),
  ],
);
