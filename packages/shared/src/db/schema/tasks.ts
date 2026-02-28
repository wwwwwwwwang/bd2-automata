import { sql } from 'drizzle-orm';
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { gameAccounts } from './game-accounts';

// 异步任务队列 - 与 backup_schema_only.sql 对齐
export const tasks = sqliteTable('automata_task_queue', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  taskType: text('task_type').notNull(),
  accountId: integer('account_id').references(() => gameAccounts.id, { onDelete: 'cascade' }),
  payload: text('payload', { mode: 'json' }).notNull(),
  status: text('status').default('pending').notNull(),
  retryCount: integer('retry_count').default(0).notNull(),
  maxRetries: integer('max_retries').default(3).notNull(),
  errorMessage: text('error_message'),
  startedAt: text('started_at'),
  completedAt: text('completed_at'),
  priority: integer('priority').default(0),
  nextRetryAt: text('next_retry_at'),
  executionHistory: text('execution_history', { mode: 'json' }).default('[]'),
  createdBy: integer('created_by').default(0),
  updatedBy: integer('updated_by').default(0),
  createdAt: text('created_at').notNull().default(sql`(CURRENT_TIMESTAMP)`),
  updatedAt: text('updated_at').notNull().default(sql`(CURRENT_TIMESTAMP)`),
  version: integer('version').default(0),
  isDeleted: integer('is_deleted', { mode: 'boolean' }).notNull().default(false),
});
