import { sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { timestamps } from './timestamps';

export const settings = sqliteTable('settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
  ...timestamps(),
});
