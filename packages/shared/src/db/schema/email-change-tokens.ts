import { sql } from 'drizzle-orm';
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { users } from './users';

// 邮箱变更令牌表
export const emailChangeTokens = sqliteTable('automata_email_change_tokens', {
  id: integer('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  oldEmail: text('old_email').notNull(),
  newEmail: text('new_email').notNull(),
  token: text('token').notNull().unique(),
  oldCode: text('old_code').notNull(),
  newCode: text('new_code').notNull(),
  oldVerified: integer('old_verified', { mode: 'boolean' }).default(false),
  newVerified: integer('new_verified', { mode: 'boolean' }).default(false),
  oldAttempts: integer('old_attempts').default(0),
  newAttempts: integer('new_attempts').default(0),
  expiresAt: text('expires_at').notNull(),
  createdAt: text('created_at').notNull().default(sql`(CURRENT_TIMESTAMP)`),
});
