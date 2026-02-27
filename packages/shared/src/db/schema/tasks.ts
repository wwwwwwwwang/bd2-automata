import { sql } from 'drizzle-orm';
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { TASK_STATUS } from '../../enums';

// 异步任务队列 - 根据 task.html 设计方案进行增强
export const tasks = sqliteTable('task_queue', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  taskType: text('task_type').notNull(),
  payload: text('payload', { mode: 'json' }),
  status: text('status', {
    enum: TASK_STATUS,
  })
    .default('pending')
    .notNull(),
  retryCount: integer('retry_count').default(0).notNull(),
  maxRetries: integer('max_retries').default(3).notNull(),
  nextRetryAt: integer('next_retry_at'), // 存储毫秒级 Unix 时间戳
  executionHistory: text('execution_history', { mode: 'json' }).default('[]'),
  createdAt: integer('created_at')
    .notNull()
    .default(sql`(strftime('%s', 'now') * 1000)`),
  updatedAt: integer('updated_at')
    .notNull()
    .default(sql`(strftime('%s', 'now') * 1000)`),
});
