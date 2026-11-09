import { sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { timestamps } from './timestamps';

export const modelProviders = sqliteTable('model_providers', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  model_names: text('model_names').notNull(),
  base_url: text('base_url').notNull(),
  encrypted_key: text('encrypted_key'),
  ...timestamps(),
});
