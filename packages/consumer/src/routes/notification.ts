import { Hono } from 'hono';
import type { Env } from '../env';

const notificationRoutes = new Hono<{ Bindings: Env }>();

// 发送通知（预留） — 当前由占位路由响应，后续再接入实际发送能力
notificationRoutes.post('/send-notification', async (c) => {
  // TODO: 实现通知发送逻辑
  // 接收 body 中的通知参数，发送邮件/推送
  return c.json({ status: 'ok' });
});

export default notificationRoutes;
