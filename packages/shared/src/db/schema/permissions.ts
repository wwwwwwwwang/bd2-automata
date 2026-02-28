import { sql } from 'drizzle-orm';
import { sqliteTable, text, integer, foreignKey } from 'drizzle-orm/sqlite-core';
import { PERMISSION_TYPE } from '../../enums';

// 权限表（SQLite INTEGER 为 64 位，语义对齐 BIGINT）
export const permissions = sqliteTable('automata_permissions', {
  id: integer('id', { mode: 'number' }).primaryKey(),
  code: text('code').notNull().unique(),
  name: text('name').notNull(),
  type: text('type', { enum: PERMISSION_TYPE }).default('button'),
  parentId: integer('parent_id'),
  menuPath: text('menu_path'),
  icon: text('icon'),
  description: text('description'),
  httpMethod: text('http_method'),
  apiPath: text('api_path'),
  sortOrder: integer('sort_order').default(0),
  createdAt: text('created_at').notNull().default(sql`(CURRENT_TIMESTAMP)`),
  updatedAt: text('updated_at').notNull().default(sql`(CURRENT_TIMESTAMP)`),
  isDeleted: integer('is_deleted', { mode: 'boolean' }).notNull().default(false),
  deletedAt: text('deleted_at'),
}, (table) => ({
  parentFk: foreignKey({
    columns: [table.parentId],
    foreignColumns: [table.id],
  }).onDelete('cascade'),
}));

