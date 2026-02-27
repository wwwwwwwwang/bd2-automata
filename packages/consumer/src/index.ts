import { Hono } from 'hono';

type Env = {
  DB: D1Database;
  SELF: Service;
  RESEND_API_KEY: string;
};

const app = new Hono<{ Bindings: Env }>();

// 健康检查
app.get('/', (c) => c.json({ status: 'ok', service: 'bd2-automata-consumer' }));

// 处理邮件队列 — 由 API Worker 通过 Service Binding 调用
app.post('/process-emails', async (c) => {
  // TODO: 实现邮件队列消费逻辑
  // 从 D1 读取 pending 邮件，通过 Resend API 发送
  return c.json({ status: 'ok', processed: 0 });
});

// 发送通知 — 由 API Worker 通过 Service Binding 调用
app.post('/send-notification', async (c) => {
  // TODO: 实现通知发送逻辑
  // 接收 body 中的通知参数，发送邮件/推送
  return c.json({ status: 'ok' });
});

export default app;
