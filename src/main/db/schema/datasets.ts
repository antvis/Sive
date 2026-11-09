import { sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { timestamps } from './timestamps';

export const datasets = sqliteTable('datasets', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  source_type: text('source_type').notNull(),
  source_config: text('source_config').notNull(),
  schema: text('schema').notNull(),
  profile: text('profile').notNull(),
  semantic: text('semantic').notNull().default(''),
  metrics: text('metrics'),
  encrypted_credentials: text('encrypted_credentials'),
  ...timestamps(),
});
