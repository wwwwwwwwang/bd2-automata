import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { secureHeaders } from 'hono/secure-headers';
import { HTTPException } from 'hono/http-exception';
import { authMiddleware, rbacMiddleware } from './middlewares/auth';

import { and, eq, sql } from 'drizzle-orm';
import { cronConfigs, tasks } from '@bd2-automata/shared';
import { isCronMatchNow, calculateNextRetry } from './cron/utils';
import { dispatchToHandler } from './cron/handlers';
import { getDb } from './db/drizzle';

import users from './routes/users';
import roles from './routes/roles';
import tasksRoute from './routes/tasks';
import emailTemplates from './routes/email-templates';
import auth from './routes/auth';
import emailQueue from './routes/email-queue';
import emailStats from './routes/email-stats';
import dailyAttendanceLogs from './routes/daily-attendance-logs';
import weeklyAttendanceLogs from './routes/weekly-attendance-logs';
import redemptionLogs from './routes/redemption-logs';
import eventParticipationLogs from './routes/event-participation-logs';
import dictionaryTypes from './routes/dictionary-types';
import dictionaryItems from './routes/dictionary-items';
import giftCodes from './routes/gift-codes';
import events from './routes/events';
import gameAccounts from './routes/game-accounts';
import logs from './routes/logs';
import permissions from './routes/permissions';
import admin from './routes/admin'; // 新增
import webhooks from './routes/webhooks';


/**
 * 定义 Cloudflare Worker 的环境绑定类型。
 */
export type Env = {
  DB: D1Database;
  CONSUMER: Service;
  JWT_SECRET: string;
  PERMISSION_CACHE: KVNamespace;
  RESEND_API_KEY: string;
  RESEND_WEBHOOK_SECRET: string;
  CORS_ORIGIN: string;
};

// ===================================================================
// 1. HTTP 请求处理器 (Hono)
// ===================================================================
const app = new Hono<{ Bindings: Env }>();

// 应用一些通用的中间件
app.use('*', logger());
app.use('*', async (c, next) => {
  const allowedOrigins = c.env.CORS_ORIGIN
    ? c.env.CORS_ORIGIN.split(',').map((s: string) => s.trim())
    : [];
  const corsHandler = cors({
    origin: allowedOrigins,
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  });
  return corsHandler(c, next);
});
app.use('*', secureHeaders());

// 统一错误处理
app.onError((err, c) => {
  if (err instanceof HTTPException) {
    return c.json({ success: false, error: err.message }, err.status);
  }
  console.error(`服务器内部错误: ${err.message}`, err.stack);
  return c.json({ success: false, error: 'Internal Server Error' }, 500);
});

// 公开路由 (不需要认证)
const publicRoutes = app.basePath('/api').route('/auth', auth);

// Webhook 路由 (Resend 回调，签名验证代替 Bearer token)
app.route('/api/webhooks/resend', webhooks);

// 健康检查
app.get('/api/health', (c) => c.json({ success: true, data: { status: 'ok' } }));

// 受保护的路由 (需要认证和授权)
const protectedRoutes = new Hono<{ Bindings: Env }>()
  .use('*', authMiddleware) // 1. 认证
  .use('*', rbacMiddleware) // 2. 授权
  .route('/users', users)
  .route('/roles', roles)
  .route('/permissions', permissions)
  .route('/dictionary-types', dictionaryTypes)
  .route('/dictionary-items', dictionaryItems)
  .route('/gift-codes', giftCodes)
  .route('/events', events)
  .route('/game-accounts', gameAccounts)
  .route('/logs', logs)
  .route('/tasks', tasksRoute)
  .route('/email-templates', emailTemplates)
  .route('/email-queue', emailQueue)
  .route('/email-stats', emailStats)
  .route('/daily-attendance-logs', dailyAttendanceLogs)
  .route('/weekly-attendance-logs', weeklyAttendanceLogs)
  .route('/redemption-logs', redemptionLogs)
  .route('/event-participation-logs', eventParticipationLogs)
  .route('/admin', admin); // 新增

// 将受保护的路由挂载到主应用上
app.route('/api', protectedRoutes);

// 404 兜底
app.notFound((c) => c.json({ success: false, error: 'Not Found' }, 404));

export type AppType = typeof app;

// ===================================================================
// 2. 定时任务处理器 (Scheduled)
// ===================================================================
async function scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
  const db = getDb(env.DB);
  const START_TIME = Date.now();
  const TIME_LIMIT = 25000; // 25秒软超时限制

  console.log(`[${new Date().toISOString()}] 定时任务启动。`);

  /* ================= Phase 1: 调度器 (Orchestrator) ================= */
  try {
    const configs = await db.select().from(cronConfigs).where(eq(cronConfigs.isActive, true)).all();

    for (const config of configs) {
      if (isCronMatchNow(config.cronExpression)) {
        // 去重：检查是否已存在同类型的 pending 任务
        const existing = await db.select({ id: tasks.id })
          .from(tasks)
          .where(and(
            eq(tasks.taskType, config.taskType),
            eq(tasks.status, 'pending'),
          ))
          .limit(1);

        if (existing.length > 0) {
          console.log(`跳过重复任务: ${config.taskType}，已有 pending 任务。`);
          continue;
        }

        console.log(`正在触发任务: ${config.taskType}`);
        await db.insert(tasks).values({
          taskType: config.taskType,
          status: 'pending',
        }).run();
      }
    }
  } catch (error) {
    console.error("调度器阶段出错:", error);
    // 如果调度阶段失败，则不继续执行，等待下一次 Cron
    return;
  }

  /* ================= Phase 2: 消费者 (Processor) ================= */
  while (Date.now() - START_TIME < TIME_LIMIT) {
    const now = Date.now();
    let task;

    try {
      // 原子性获取任务 (完美替代 SKIP LOCKED)
      const getTaskSql = sql`
        UPDATE ${tasks}
        SET status = 'in_progress', updated_at = ${now}
        WHERE id = (
          SELECT id FROM ${tasks}
          WHERE status = 'pending'
            AND (next_retry_at IS NULL OR next_retry_at <= ${now})
          ORDER BY created_at ASC
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
        console.log("未找到待处理任务，退出处理器循环。");
        break; // 队列为空，结束当前轮次
      }

      console.log(`正在处理任务 ID: ${task.id}, 类型: ${task.taskType}`);

      // 分发给处理器执行
      await dispatchToHandler(task, env);

      // 任务成功，更新状态
      await db.update(tasks)
        .set({ status: 'completed', updatedAt: Date.now() })
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
            .set({ status: 'failed', updatedAt: Date.now() })
            .where(eq(tasks.id, task.id))
            .run();
        } else {
          // 计算下一次重试时间并更新
          await db.update(tasks)
            .set({
              status: 'pending', // 放回队列
              retryCount: newRetryCount,
              nextRetryAt: calculateNextRetry(newRetryCount),
              updatedAt: Date.now(),
            })
            .where(eq(tasks.id, task.id))
            .run();
        }
      }
    }
  }

  if (Date.now() - START_TIME >= TIME_LIMIT) {
    console.log("已达到时间限制。剩余任务将在下一次运行中处理。");
  }
}

// ===================================================================
// 3. 导出模块
// ===================================================================
export default {
  fetch: app.fetch,
  scheduled,
};
