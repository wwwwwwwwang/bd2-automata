import { sql } from 'drizzle-orm';
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { gameAccounts } from './game-accounts';
import { giftCodes } from './gift-codes';
import { REDEMPTION_STATUS } from '../../enums';

// 礼包码兑换日志表（SQLite INTEGER 为 64 位，语义对齐 BIGINT）
export const redemptionLogs = sqliteTable('automata_redemption_logs', {
  id: integer('id').primaryKey(),
  gameAccountId: integer('game_account_id').notNull().references(() => gameAccounts.id, { onDelete: 'cascade' }),
  giftCodeId: integer('gift_code_id').references(() => giftCodes.id, { onDelete: 'set null' }),
  codeUsed: text('code_used').notNull(),
  status: text('status', { enum: REDEMPTION_STATUS }).notNull(),
  message: text('message'),
  createdAt: text('created_at').notNull().default(sql`(CURRENT_TIMESTAMP)`),
});
