import { sql } from 'drizzle-orm';
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

// 游戏活动日程表
export const eventSchedules = sqliteTable('automata_event_schedules', {
  id: integer('id', { mode: 'number' }).primaryKey(),
  eventScheduleId: integer('event_schedule_id').notNull().unique(),
  startDate: text('start_date').notNull(),
  endDate: text('end_date').notNull(),
  isActive: integer('is_active', { mode: 'boolean' }).default(true),
  rewardInfo: text('reward_info', { mode: 'json' }),
  popupInfo: text('popup_info', { mode: 'json' }),
  createdAt: text('created_at').notNull().default(sql`(CURRENT_TIMESTAMP)`),
  updatedAt: text('updated_at').notNull().default(sql`(CURRENT_TIMESTAMP)`),
  isDeleted: integer('is_deleted', { mode: 'boolean' }).notNull().default(false),
  deletedAt: text('deleted_at'),
});
