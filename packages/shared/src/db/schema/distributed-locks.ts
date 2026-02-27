import { sqliteTable, text } from 'drizzle-orm/sqlite-core';

// TODO: 实现分布式锁服务，用于多 Worker 实例部署时的任务调度互斥
// 分布式锁表
export const distributedLocks = sqliteTable('automata_distributed_locks', {
  lockKey: text('lock_key').primaryKey(),
  lockedBy: text('locked_by').notNull(),
  lockedAt: text('locked_at').notNull(),
  expiresAt: text('expires_at').notNull(),
});
