import { sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const modelProviders = sqliteTable('model_providers', {
  // Unique identifier of the model provider.
  id: text('id').primaryKey(),

  // Display name of the model provider.
  name: text('name').notNull(),

  // JSON array of available model names or invocation identifiers.
  modelNames: text('model_names').notNull(),

  // Base URL of the model provider API.
  baseUrl: text('base_url').notNull(),

  // Base64-encoded API key encrypted with safeStorage, or null when no key is stored.
  encryptedKey: text('encrypted_key'),

  // Creation timestamp.
  createdAt: text('created_at').notNull(),

  // Last modification timestamp.
  updatedAt: text('updated_at').notNull(),

  // Soft deletion timestamp.
  deletedAt: text('deleted_at'),
});
