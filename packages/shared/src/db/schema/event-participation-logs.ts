import { sql } from 'drizzle-orm';
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { gameAccounts } from './game-accounts';
import { eventSchedules } from './events';

// 游戏事件参与日志表（SQLite INTEGER 为 64 位，语义对齐 BIGINT）
export const eventParticipationLogs = sqliteTable('automata_event_participation_logs', {
  id: integer('id', { mode: 'number' }).primaryKey(),
  gameAccountId: integer('game_account_id').notNull().references(() => gameAccounts.id, { onDelete: 'cascade' }),
  eventScheduleId: integer('event_schedule_id').references(() => eventSchedules.eventScheduleId, { onDelete: 'set null' }),
  participationResult: integer('participation_result').default(1),
  responseMsg: text('response_msg'),
  taskId: integer('task_id'),
  createdBy: integer('created_by').default(0),
  updatedBy: integer('updated_by').default(0),
  createdAt: text('created_at').notNull().default(sql`(CURRENT_TIMESTAMP)`),
  updatedAt: text('updated_at').notNull().default(sql`(CURRENT_TIMESTAMP)`),
  version: integer('version').default(0),
  isDeleted: integer('is_deleted', { mode: 'boolean' }).notNull().default(false),
});
