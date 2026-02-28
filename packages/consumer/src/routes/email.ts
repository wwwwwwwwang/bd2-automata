import { Hono } from 'hono';
import type { Env } from '../env';

const emailRoutes = new Hono<{ Bindings: Env }>();

// 处理邮件队列（预留） — 当前实际发送逻辑仍由 API Worker 侧执行
emailRoutes.post('/process-emails', async (c) => {
  // TODO: 实现邮件队列消费逻辑
  // 从 D1 读取 pending 邮件，通过 Resend API 发送
  return c.json({ status: 'ok', processed: 0 });
});

export default emailRoutes;
