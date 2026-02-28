import { sql } from 'drizzle-orm';
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

// 邮件统计表
export const emailStats = sqliteTable('automata_email_stats', {
  id: integer('id', { mode: 'number' }).primaryKey(),
  statDate: text('stat_date').notNull().unique(),
  totalSent: integer('total_sent').default(0),
  totalDelivered: integer('total_delivered').default(0),
  totalFailed: integer('total_failed').default(0),
  totalBounced: integer('total_bounced').default(0),
  totalComplained: integer('total_complained').default(0),
  totalPending: integer('total_pending').default(0),
  passwordResetCount: integer('password_reset_count').default(0),
  tokenExpiredCount: integer('token_expired_count').default(0),
  systemNotifyCount: integer('system_notify_count').default(0),
  createdBy: integer('created_by').default(0),
  updatedBy: integer('updated_by').default(0),
  createdAt: text('created_at').notNull().default(sql`(CURRENT_TIMESTAMP)`),
  updatedAt: text('updated_at').notNull().default(sql`(CURRENT_TIMESTAMP)`),
  version: integer('version').default(0),
  isDeleted: integer('is_deleted', { mode: 'boolean' }).notNull().default(false),
});
