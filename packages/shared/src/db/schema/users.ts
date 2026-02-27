import { sql } from 'drizzle-orm';
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

// 用户主表（SQLite INTEGER 为 64 位，语义对齐 BIGINT）
export const users = sqliteTable('automata_users', {
  id: integer('id').primaryKey(),
  username: text('username').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  isActive: integer('is_active', { mode: 'boolean' }).default(true),
  maxGameAccounts: integer('max_game_accounts').default(3),
  email: text('email'),
  emailVerified: integer('email_verified', { mode: 'boolean' }).default(false),
  emailVerifyToken: text('email_verify_token'),
  emailVerifyTokenExpires: integer('email_verify_token_expires'),
  lastLoginAt: text('last_login_at'),
  createdAt: text('created_at').notNull().default(sql`(CURRENT_TIMESTAMP)`),
  updatedAt: text('updated_at').notNull().default(sql`(CURRENT_TIMESTAMP)`),
  isDeleted: integer('is_deleted', { mode: 'boolean' }).notNull().default(false),
  deletedAt: text('deleted_at'),
});
