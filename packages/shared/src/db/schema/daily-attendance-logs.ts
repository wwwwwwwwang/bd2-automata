import { sql } from 'drizzle-orm';
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { gameAccounts } from './game-accounts';
import { ATTENDANCE_STATUS } from '../../enums';

// 每日签到日志表（SQLite INTEGER 为 64 位，语义对齐 BIGINT）
export const dailyAttendanceLogs = sqliteTable('automata_daily_attendance_logs', {
  id: integer('id').primaryKey(),
  gameAccountId: integer('game_account_id').notNull().references(() => gameAccounts.id, { onDelete: 'cascade' }),
  status: text('status', { enum: ATTENDANCE_STATUS }).notNull(),
  message: text('message'),
  attendanceDate: text('attendance_date').notNull(), // 签到日期 (YYYY-MM-DD)
  createdAt: text('created_at').notNull().default(sql`(CURRENT_TIMESTAMP)`),
});
