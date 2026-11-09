import { sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const datasets = sqliteTable('datasets', {
  // Unique identifier of the dataset.
  id: text('id').primaryKey(),

  // Display name of the dataset.
  name: text('name').notNull(),

  // Type of the data source.
  source_type: text('source_type').notNull(),

  // JSON object containing non-sensitive source configuration.
  source_config: text('source_config').notNull(),

  // JSON object containing the AVA data schema.
  schema: text('schema').notNull(),

  // JSON object containing the AVA data profile.
  profile: text('profile').notNull(),

  // Business semantic description of the dataset.
  semantic: text('semantic').notNull().default(''),

  // Optional JSON array of business metric definitions.
  metrics: text('metrics'),

  // Optional Base64-encoded credentials object encrypted with safeStorage.
  encrypted_credentials: text('encrypted_credentials'),

  // Creation timestamp.
  created_at: text('created_at').notNull(),

  // Last modification timestamp.
  updated_at: text('updated_at').notNull(),

  // Soft deletion timestamp.
  deleted_at: text('deleted_at'),
});
