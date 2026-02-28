import { sql } from 'drizzle-orm';
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { gameAccounts } from './game-accounts';
import { giftCodes } from './gift-codes';

// 礼包码兑换日志表（SQLite INTEGER 为 64 位，语义对齐 BIGINT）
export const redemptionLogs = sqliteTable('automata_redemption_logs', {
  id: integer('id', { mode: 'number' }).primaryKey(),
  gameAccountId: integer('game_account_id').notNull().references(() => gameAccounts.id, { onDelete: 'cascade' }),
  giftCodeId: integer('gift_code_id').references(() => giftCodes.id, { onDelete: 'cascade' }),
  codeUsed: text('code_used').notNull(),
  redeemResult: integer('redeem_result').default(1),
  responseMsg: text('response_msg'),
  taskId: integer('task_id'),
  createdBy: integer('created_by').default(0),
  updatedBy: integer('updated_by').default(0),
  createdAt: text('created_at').notNull().default(sql`(CURRENT_TIMESTAMP)`),
  updatedAt: text('updated_at').notNull().default(sql`(CURRENT_TIMESTAMP)`),
  version: integer('version').default(0),
  isDeleted: integer('is_deleted', { mode: 'boolean' }).notNull().default(false),
});
