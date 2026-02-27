import { sql } from 'drizzle-orm';
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { users } from './users';
import { PROVIDER_TYPE } from '../../enums';

// 游戏账号表
export const gameAccounts = sqliteTable('automata_game_accounts', {
  id: integer('id', { mode: 'number' }).primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  gameNickname: text('game_nickname').notNull().unique(),
  refreshToken: text('refresh_token').notNull(),
  isActive: integer('is_active', { mode: 'boolean' }).default(true),
  lastSyncAt: text('last_sync_at'),
  autoDailyAttend: integer('auto_daily_attend', { mode: 'boolean' }).default(true),
  autoWeeklyAttend: integer('auto_weekly_attend', { mode: 'boolean' }).default(true),
  autoRedeem: integer('auto_redeem', { mode: 'boolean' }).default(true),
  autoEventAttend: integer('auto_event_attend', { mode: 'boolean' }).default(true),
  tokenExpiredNotification: integer('token_expired_notification', { mode: 'boolean' }).default(true),
  providerType: text('provider_type', { enum: PROVIDER_TYPE }).default('GOOGLE'),
  createdAt: text('created_at').notNull().default(sql`(CURRENT_TIMESTAMP)`),
  updatedAt: text('updated_at').notNull().default(sql`(CURRENT_TIMESTAMP)`),
  isDeleted: integer('is_deleted', { mode: 'boolean' }).notNull().default(false),
  deletedAt: text('deleted_at'),
});
