import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { secureHeaders } from 'hono/secure-headers';
import { HTTPException } from 'hono/http-exception';
import { authMiddleware, rbacMiddleware } from './middlewares/auth';
import type { Env } from './env';

import users from './routes/users';
import roles from './routes/roles';
import tasksRoute from './routes/tasks';
import emailTemplates from './routes/email-templates';
import { publicAuthRoutes, protectedAuthRoutes } from './routes/auth';
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
import admin from './routes/admin';
import webhooks from './routes/webhooks';

const app = new Hono<{ Bindings: Env }>();

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

app.onError((err, c) => {
  if (err instanceof HTTPException) {
    return c.json({ success: false, error: err.message }, err.status);
  }
  console.error(`服务器内部错误: ${err.message}`, err.stack);
  return c.json({ success: false, error: 'Internal Server Error' }, 500);
});

app.basePath('/api').route('/auth', publicAuthRoutes);

// Webhook 路由 (Resend 邮件状态回调，签名验证代替 Bearer token)
app.route('/api/webhooks/resend', webhooks);

app.get('/api/health', (c) => c.json({ success: true, data: { status: 'ok' } }));

const protectedRoutes = new Hono<{ Bindings: Env }>()
  .use('*', authMiddleware)
  .use('*', rbacMiddleware)
  .route('/auth', protectedAuthRoutes)
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
  .route('/admin', admin);

app.route('/api', protectedRoutes);

app.notFound((c) => c.json({ success: false, error: 'Not Found' }, 404));

export type AppType = typeof app;
export { app };
