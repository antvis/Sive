import { customType, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import type { DataSourceConfig, Profile, Schema, Semantic } from '@antv/ava';
import { decrypt, encrypt } from '../../util';

const encryptedSourceConfig = customType<{ data: DataSourceConfig; driverData: string }>({
  dataType() {
    return 'text';
  },
  toDriver(value) {
    return encrypt(JSON.stringify(value));
  },
  fromDriver(value) {
    return JSON.parse(decrypt(value));
  },
});

export const datasets = sqliteTable('datasets', {
  // Unique identifier of the dataset.
  id: text('id').primaryKey(),

  // Display name of the dataset.
  name: text('name').notNull(),

  // AVA data source type, mirrored from sourceConfig.type.
  sourceType: text('source_type').$type<DataSourceConfig['type']>().notNull(),

  // Encrypted JSON object containing source configuration and credentials.
  sourceConfig: encryptedSourceConfig('source_config').notNull(),

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
