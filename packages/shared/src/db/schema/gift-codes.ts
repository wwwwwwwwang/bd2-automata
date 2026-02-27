import { sql } from 'drizzle-orm';
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

// 全局礼包码表
export const giftCodes = sqliteTable('automata_gift_codes', {
  id: integer('id').primaryKey(),
  code: text('code').notNull().unique(),
  rewardDesc: text('reward_desc'),
  isActive: integer('is_active', { mode: 'boolean' }).default(true),
  expiredAt: text('expired_at'),
  createdAt: text('created_at').notNull().default(sql`(CURRENT_TIMESTAMP)`),
  updatedAt: text('updated_at').notNull().default(sql`(CURRENT_TIMESTAMP)`),
  isDeleted: integer('is_deleted', { mode: 'boolean' }).notNull().default(false),
  deletedAt: text('deleted_at'),
});
