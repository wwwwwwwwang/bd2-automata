import { and, eq, sql } from 'drizzle-orm';
import { cronConfigs, tasks, TASK_TYPES } from '@bd2-automata/shared';
import { isCronMatchNow, calculateNextRetry } from './utils';
import { dispatchToHandler } from './handlers';
import { getDb } from '../db/drizzle';
import type { Env } from '../env';

type ScheduledTaskType = typeof TASK_TYPES[number];

const isScheduledTaskType = (value: string): value is ScheduledTaskType =>
  (TASK_TYPES as readonly string[]).includes(value);

export async function scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
  const db = getDb(env.DB);
  const START_TIME = Date.now();
  const TIME_LIMIT = 25000; // 25秒软超时限制

  console.log(`[${new Date().toISOString()}] 定时任务启动。`);

  /* ================= Phase 1: 调度器 (Orchestrator) ================= */
  try {
    const configs = await db.select().from(cronConfigs).where(eq(cronConfigs.isActive, true)).all();

    for (const config of configs) {
      if (isCronMatchNow(config.cronExpression)) {
        if (!isScheduledTaskType(config.taskType)) {
          console.warn(`跳过无效 taskType 配置: ${config.taskType}`);
          continue;
        }

        // 去重：检查是否已存在同类型的 pending 任务
        const existing = await db.select({ id: tasks.id })
          .from(tasks)
          .where(and(
            eq(tasks.taskType, config.taskType),
            eq(tasks.status, 'pending'),
            eq(tasks.isDeleted, false),
          ))
          .limit(1);

        if (existing.length > 0) {
          console.log(`跳过重复任务: ${config.taskType}，已有 pending 任务。`);
          continue;
        }

        console.log(`正在触发任务: ${config.taskType}`);
        await db.insert(tasks).values({
          taskType: config.taskType,
          payload: {},
          status: 'pending',
        }).run();
      }
    }
  } catch (error) {
    console.error('调度器阶段出错:', error);
    // 如果调度阶段失败，则不继续执行，等待下一次 Cron
    return;
  }

  /* ================= Phase 2: 消费者 (Processor) ================= */
  while (Date.now() - START_TIME < TIME_LIMIT) {
    let task;

    try {
      // 原子性获取任务 (完美替代 SKIP LOCKED)
      const getTaskSql = sql`
        UPDATE ${tasks}
        SET status = 'processing', started_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
        WHERE id = (
          SELECT id FROM ${tasks}
          WHERE status = 'pending'
            AND is_deleted = 0
            AND (next_retry_at IS NULL OR datetime(next_retry_at) <= CURRENT_TIMESTAMP)
          ORDER BY priority DESC, created_at ASC
          LIMIT 1
        )
        RETURNING
          id,
          task_type AS taskType,
          payload,
          status,
          retry_count AS retryCount,
          max_retries AS maxRetries,
          next_retry_at AS nextRetryAt,
          execution_history AS executionHistory,
          created_at AS createdAt,
          updated_at AS updatedAt;
      `;
      const result = await db.get<typeof tasks.$inferSelect>(getTaskSql);
      task = result;

      if (!task) {
        console.log('未找到待处理任务，退出处理器循环。');
        break; // 队列为空，结束当前轮次
      }

      console.log(`正在处理任务 ID: ${task.id}, 类型: ${task.taskType}`);

      // 分发给处理器执行
      await dispatchToHandler(task, env);

      // 任务成功，更新状态
      await db.update(tasks)
        .set({ status: 'completed', completedAt: new Date().toISOString(), updatedAt: new Date().toISOString() })
        .where(eq(tasks.id, task.id))
        .run();

      console.log(`任务 ID: ${task.id} 已成功完成。`);

    } catch (err: any) {
      console.error(`处理任务 ID: ${task?.id} 时出错。错误:`, err.message);
      if (task) {
        const newRetryCount = task.retryCount + 1;
        if (newRetryCount > task.maxRetries) {
          // 达到最大重试次数，标记为失败
          await db.update(tasks)
            .set({
              status: 'failed',
              errorMessage: String(err?.message ?? 'Unknown error'),
              completedAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            })
            .where(eq(tasks.id, task.id))
            .run();
        } else {
          // 计算下一次重试时间并更新
          await db.update(tasks)
            .set({
              status: 'pending', // 放回队列
              retryCount: newRetryCount,
              errorMessage: String(err?.message ?? 'Unknown error'),
              nextRetryAt: calculateNextRetry(newRetryCount),
              updatedAt: new Date().toISOString(),
            })
            .where(eq(tasks.id, task.id))
            .run();
        }
      }
    }
  }

  if (Date.now() - START_TIME >= TIME_LIMIT) {
    console.log('已达到时间限制。剩余任务将在下一次运行中处理。');
  }
}
