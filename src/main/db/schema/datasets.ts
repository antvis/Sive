import { sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const datasets = sqliteTable('datasets', {
  // Unique identifier of the dataset.
  id: text('id').primaryKey(),

  // Display name of the dataset.
  name: text('name').notNull(),

  // Type of the data source.
  sourceType: text('source_type').notNull(),

  // JSON object containing non-sensitive source configuration.
  sourceConfig: text('source_config').notNull(),

  // JSON object containing the AVA data schema.
  schema: text('schema').notNull(),

  // JSON object containing the AVA data profile.
  profile: text('profile').notNull(),

  // Business semantic description of the dataset.
  semantic: text('semantic').notNull().default(''),

  // Optional JSON array of business metric definitions.
  metrics: text('metrics'),

  // Optional Base64-encoded credentials object encrypted with safeStorage.
  encryptedCredentials: text('encrypted_credentials'),

  // Creation timestamp.
  createdAt: text('created_at').notNull(),

  // Last modification timestamp.
  updatedAt: text('updated_at').notNull(),

  // Soft deletion timestamp.
  deletedAt: text('deleted_at'),
});
