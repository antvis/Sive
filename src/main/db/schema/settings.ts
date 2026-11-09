import { sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const settings = sqliteTable('settings', {
  // Unique name of the setting.
  key: text('key').primaryKey(),

  // JSON-encoded setting value.
  value: text('value', { mode: 'json' }).notNull(),

  // Creation timestamp.
  createdAt: text('created_at').notNull(),

  // Last modification timestamp.
  updatedAt: text('updated_at').notNull(),

  // Soft deletion timestamp.
  deletedAt: text('deleted_at'),
});
