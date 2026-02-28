import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

// 任务调度配置表
export const cronConfigs = sqliteTable('automata_cron_configs', {
  taskType: text('task_type').primaryKey(),
  cronExpression: text('cron_expression').notNull(),
  isActive: integer('is_active', { mode: 'boolean' }).default(true).notNull(),
});
