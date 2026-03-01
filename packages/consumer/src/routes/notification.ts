import { Hono } from 'hono';
import type { Env } from '../env';
import { dispatchConsumerTask } from '../services/dispatcher';

const notificationRoutes = new Hono<{ Bindings: Env }>();

notificationRoutes.post('/send-notification', async (c) => {
  const rawBody = await c.req.text();
  let payload: unknown = undefined;

  if (rawBody.trim().length > 0) {
    try {
      payload = JSON.parse(rawBody);
    } catch {
      return c.json({ status: 'error', taskType: 'NOTIFICATION_SEND', error: '请求体必须是合法 JSON' }, 400);
    }
  }

  try {
    const result = await dispatchConsumerTask(c.env, 'NOTIFICATION_SEND', payload);
    return c.json(result);
  } catch (error: any) {
    return c.json(
      {
        status: 'error',
        taskType: 'NOTIFICATION_SEND',
        error: error?.message ?? '发送通知失败',
      },
      500,
    );
  }
});

export default notificationRoutes;
