import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

// bootstrap.ts owns SQL constraints and indexes. These mappings keep queries typed
// against the existing column names; this app does not generate DDL from Drizzle.
const timestamps = () => ({
  created_at: text('created_at').notNull(),
  updated_at: text('updated_at').notNull(),
  deleted_at: text('deleted_at'),
});

export const modelProviders = sqliteTable('model_providers', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  model_names: text('model_names').notNull(),
  base_url: text('base_url').notNull(),
  encrypted_key: text('encrypted_key'),
  ...timestamps(),
});
export const settings = sqliteTable('settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
  ...timestamps(),
});
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
export const conversations = sqliteTable('conversations', {
  id: text('id').primaryKey(),
  dataset_id: text('dataset_id')
    .notNull()
    .references(() => datasets.id, { onDelete: 'restrict' }),
  title: text('title').notNull(),
  ...timestamps(),
});
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
