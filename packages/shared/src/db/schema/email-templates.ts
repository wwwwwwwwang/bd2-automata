import { sql } from 'drizzle-orm';
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

// 邮件模板表
export const emailTemplates = sqliteTable('automata_email_templates', {
  id: integer('id', { mode: 'number' }).primaryKey(),
  name: text('name').notNull().unique(),
  displayName: text('display_name').notNull(),
  subject: text('subject').notNull(),
  htmlContent: text('html_content').notNull(),
  description: text('description'),
  availableVars: text('available_vars', { mode: 'json' }),
  isActive: integer('is_active', { mode: 'boolean' }).default(true),
  createdAt: text('created_at').notNull().default(sql`(CURRENT_TIMESTAMP)`),
  updatedAt: text('updated_at').notNull().default(sql`(CURRENT_TIMESTAMP)`),
  isDeleted: integer('is_deleted', { mode: 'boolean' }).notNull().default(false),
  deletedAt: text('deleted_at'),
});
