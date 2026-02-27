import { sql } from 'drizzle-orm';
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { tasks } from './tasks';
import { gameAccounts } from './game-accounts';
import { LOG_STATUS } from '../../enums';

// 任务执行日志表（SQLite INTEGER 为 64 位，语义对齐 BIGINT）
export const logs = sqliteTable('automata_logs', {
  id: integer('id').primaryKey(),
  taskId: integer('task_id').references(() => tasks.id, { onDelete: 'set null' }),
  gameAccountId: integer('game_account_id').references(() => gameAccounts.id, { onDelete: 'cascade' }),
  status: text('status', { enum: LOG_STATUS }).notNull(),
  message: text('message'),
  details: text('details', { mode: 'json' }), // 存储详细信息，如 API 响应
  executedAt: text('executed_at').notNull().default(sql`(CURRENT_TIMESTAMP)`),
});
