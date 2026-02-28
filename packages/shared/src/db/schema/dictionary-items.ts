import { sql } from 'drizzle-orm';
import { sqliteTable, text, integer, uniqueIndex } from 'drizzle-orm/sqlite-core';
import { dictionaries } from './dictionary-types';

// 字典数据项表
export const dictionaryItems = sqliteTable('automata_dictionary_items', {
  id: integer('id', { mode: 'number' }).primaryKey(),
  dictionaryId: integer('dictionary_id').notNull().references(() => dictionaries.id, { onDelete: 'cascade' }),
  key: text('key').notNull(),
  value: text('value').notNull(),
  label: text('label'),
  sortOrder: integer('sort_order').default(0),
  isActive: integer('is_active', { mode: 'boolean' }).default(true),
  isDefault: integer('is_default', { mode: 'boolean' }).default(false),
  createdAt: text('created_at').notNull().default(sql`(CURRENT_TIMESTAMP)`),
  updatedAt: text('updated_at').notNull().default(sql`(CURRENT_TIMESTAMP)`),
  isDeleted: integer('is_deleted', { mode: 'boolean' }).notNull().default(false),
  deletedAt: text('deleted_at'),
}, (table) => ({
  dictionaryKeyUnique: uniqueIndex('automata_dictionary_items_dictionary_id_key_unique').on(table.dictionaryId, table.key),
}));
