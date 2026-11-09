import { sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const modelProviders = sqliteTable('model_providers', {
  // Unique identifier of the model provider.
  id: text('id').primaryKey(),

  // Display name of the model provider.
  name: text('name').notNull(),

  // JSON array of available model names or invocation identifiers.
  model_names: text('model_names').notNull(),

  // Base URL of the model provider API.
  base_url: text('base_url').notNull(),

  // Base64-encoded API key encrypted with safeStorage, or null when no key is stored.
  encrypted_key: text('encrypted_key'),

  // Creation timestamp.
  created_at: text('created_at').notNull(),

  // Last modification timestamp.
  updated_at: text('updated_at').notNull(),

  // Soft deletion timestamp.
  deleted_at: text('deleted_at'),
});
