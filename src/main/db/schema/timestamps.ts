import { text } from 'drizzle-orm/sqlite-core';

export const timestamps = () => ({
  created_at: text('created_at').notNull(),
  updated_at: text('updated_at').notNull(),
  deleted_at: text('deleted_at'),
});
