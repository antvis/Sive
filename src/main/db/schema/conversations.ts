import { sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { datasets } from './datasets';
import { timestamps } from './timestamps';

export const conversations = sqliteTable('conversations', {
  id: text('id').primaryKey(),
  dataset_id: text('dataset_id')
    .notNull()
    .references(() => datasets.id, { onDelete: 'restrict' }),
  title: text('title').notNull(),
  ...timestamps(),
});
