import { sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const settings = sqliteTable('settings', {
  // Unique name of the setting.
  key: text('key').primaryKey(),

  // JSON-encoded setting value.
  value: text('value').notNull(),

  // Creation timestamp.
  created_at: text('created_at').notNull(),

  // Last modification timestamp.
  updated_at: text('updated_at').notNull(),

  // Soft deletion timestamp.
  deleted_at: text('deleted_at'),
});
