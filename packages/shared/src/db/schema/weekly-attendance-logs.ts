import { sql } from 'drizzle-orm';
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { gameAccounts } from './game-accounts';
import { ATTENDANCE_STATUS } from '../../enums';

// 每周签到日志表（SQLite INTEGER 为 64 位，语义对齐 BIGINT）
export const weeklyAttendanceLogs = sqliteTable('automata_weekly_attendance_logs', {
  id: integer('id').primaryKey(),
  gameAccountId: integer('game_account_id').notNull().references(() => gameAccounts.id, { onDelete: 'cascade' }),
  status: text('status', { enum: ATTENDANCE_STATUS }).notNull(),
  message: text('message'),
  weekIdentifier: text('week_identifier').notNull(), // 周标识 (e.g., YYYY-WW)
  createdAt: text('created_at').notNull().default(sql`(CURRENT_TIMESTAMP)`),
});
