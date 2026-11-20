import { customType, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import type { DataSourceConfig, Profile, Schema, Semantic } from '@antv/ava';
import type { StoredOAuthClientInformation, StoredOAuthTokens } from '@modelcontextprotocol/client';
import { decrypt, encrypt } from '../../util';

export type SupabaseOAuthCredentials = {
  clients: Record<string, StoredOAuthClientInformation>;
  tokens?: StoredOAuthTokens;
  expiresAt?: number;
};

export type DatasetExtras = {
  supabaseOAuth?: SupabaseOAuthCredentials;
};

function encryptedJson<T>() {
  return customType<{ data: T; driverData: string }>({
    dataType() {
      return 'text';
    },
    toDriver(value) {
      return encrypt(JSON.stringify(value));
    },
    fromDriver(value) {
      return JSON.parse(decrypt(value)) as T;
    },
  });
}

export const datasets = sqliteTable('datasets', {
  // Unique identifier of the dataset.
  id: text('id').primaryKey(),

  // Display name of the dataset.
  name: text('name').notNull(),

  // AVA data source type, mirrored from sourceConfig.type.
  sourceType: text('source_type').$type<DataSourceConfig['type']>().notNull(),

  // JSON object with Encrypted AVA data source configuration.
  sourceConfig: encryptedJson<DataSourceConfig>()('source_config').notNull(),

  // Encrypted app-specific extras for the data source.
  extras: encryptedJson<DatasetExtras>()('extras'),

  // JSON object containing the AVA data schema.
  schema: text('schema', { mode: 'json' }).$type<Schema>().notNull(),

  // JSON object containing the AVA data profile.
  profile: text('profile', { mode: 'json' }).$type<Profile>().notNull(),

  // Business semantic description of the dataset.
  semantic: text('semantic', { mode: 'json' }).$type<Semantic>().notNull(),

  // Optional JSON array of business metric definitions.
  // Only for dataset semantic, with structured data and tabular schema.
  metrics: text('metrics', { mode: 'json' }),

  // Creation timestamp.
  createdAt: text('created_at').notNull(),

  // Last modification timestamp.
  updatedAt: text('updated_at').notNull(),

  // Soft deletion timestamp.
  deletedAt: text('deleted_at'),
});

export type DatasetRow = typeof datasets.$inferSelect;

export type DatasetInsert = typeof datasets.$inferInsert;

export type DatasetUpdate = Partial<Omit<DatasetInsert, 'id' | 'createdAt'>>;
