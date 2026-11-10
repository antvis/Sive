import { customType, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import type { Dataset } from '@shared/contracts';
import { decrypt, encrypt } from '../../utils/credentials';
import type { SourceConfig } from '../types';

const encryptedSourceConfig = customType<{ data: SourceConfig; driverData: string }>({
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

  // Must be one of: csv, json, xlsx, parquet, text, mysql, postgresql, sqlite,
  // mongodb, clickhouse, http_file, supabase, feishu_bitable.
  sourceType: text('source_type').notNull(),

  // Encrypted JSON object containing source configuration and credentials.
  sourceConfig: encryptedSourceConfig('source_config').notNull(),

  // JSON object containing the AVA data schema.
  schema: text('schema', { mode: 'json' }).$type<Dataset['schema']>().notNull(),

  // JSON object containing the AVA data profile.
  profile: text('profile', { mode: 'json' }).$type<Dataset['profile']>().notNull(),

  // Business semantic description of the dataset.
  semantic: text('semantic').notNull().default(''),

  // Optional JSON array of business metric definitions.
  metrics: text('metrics', { mode: 'json' }).$type<NonNullable<Dataset['metrics']>>(),

  // Creation timestamp.
  createdAt: text('created_at').notNull(),

  // Last modification timestamp.
  updatedAt: text('updated_at').notNull(),

  // Soft deletion timestamp.
  deletedAt: text('deleted_at'),
});
