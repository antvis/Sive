import { index, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const conversations = sqliteTable(
  'conversations',
  {
    // Unique identifier of the conversation.
    id: text('id').primaryKey(),

    // Logical foreign key: datasets.id.
    datasetId: text('dataset_id').notNull(),

    // Title of the conversation.
    title: text('title').notNull(),

    // Creation timestamp.
    createdAt: text('created_at').notNull(),

    // Timestamp of the last message addition or conversation update.
    updatedAt: text('updated_at').notNull(),

    // Timestamp when the conversation was archived; cleared on restore.
    archivedAt: text('archived_at'),

    // Irreversible soft deletion timestamp.
    deletedAt: text('deleted_at'),
  },
  (table) => [index('idx_conversations_dataset').on(table.datasetId, table.createdAt, table.id)],
);
