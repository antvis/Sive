import { sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { datasets } from './datasets';

export const conversations = sqliteTable('conversations', {
  // Unique identifier of the conversation.
  id: text('id').primaryKey(),

  // Identifier of the dataset that owns the conversation.
  datasetId: text('dataset_id')
    .notNull()
    .references(() => datasets.id, { onDelete: 'restrict' }),

  // Title of the conversation.
  title: text('title').notNull(),

  // Creation timestamp.
  createdAt: text('created_at').notNull(),

  // Timestamp of the last message addition or conversation update.
  updatedAt: text('updated_at').notNull(),

  // Archive or soft deletion timestamp.
  deletedAt: text('deleted_at'),
});
