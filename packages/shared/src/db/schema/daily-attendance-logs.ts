import { sql } from 'drizzle-orm';
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { gameAccounts } from './game-accounts';

// 每日签到日志表（SQLite INTEGER 为 64 位，语义对齐 BIGINT）
export const dailyAttendanceLogs = sqliteTable('automata_daily_attendance_logs', {
  id: integer('id', { mode: 'number' }).primaryKey(),
  gameAccountId: integer('game_account_id').notNull().references(() => gameAccounts.id, { onDelete: 'cascade' }),
  attendanceDate: text('attendance_date').notNull(), // 签到日期 (YYYY-MM-DD)
  status: integer('status').default(1),
  responseMsg: text('response_msg'),
  createdBy: integer('created_by').default(0),
  updatedBy: integer('updated_by').default(0),
  createdAt: text('created_at').notNull().default(sql`(CURRENT_TIMESTAMP)`),
  updatedAt: text('updated_at').notNull().default(sql`(CURRENT_TIMESTAMP)`),
  version: integer('version').default(0),
  isDeleted: integer('is_deleted', { mode: 'boolean' }).notNull().default(false),
});
