import { sql } from 'drizzle-orm';
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { gameAccounts } from './game-accounts';
import { eventSchedules } from './events';
import { EVENT_PARTICIPATION_STATUS } from '../../enums';

// 游戏事件参与日志表（SQLite INTEGER 为 64 位，语义对齐 BIGINT）
export const eventParticipationLogs = sqliteTable('automata_event_participation_logs', {
  id: integer('id').primaryKey(),
  gameAccountId: integer('game_account_id').notNull().references(() => gameAccounts.id, { onDelete: 'cascade' }),
  eventScheduleId: integer('event_schedule_id').references(() => eventSchedules.id, { onDelete: 'set null' }),
  status: text('status', { enum: EVENT_PARTICIPATION_STATUS }).notNull(),
  message: text('message'),
  createdAt: text('created_at').notNull().default(sql`(CURRENT_TIMESTAMP)`),
});
