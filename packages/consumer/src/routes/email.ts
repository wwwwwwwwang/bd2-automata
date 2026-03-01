import { Hono } from 'hono';
import type { Env } from '../env';
import { dispatchConsumerTask } from '../services/dispatcher';

const emailRoutes = new Hono<{ Bindings: Env }>();

emailRoutes.post('/process-emails', async (c) => {
  const rawBody = await c.req.text();
  let payload: unknown = undefined;

  if (rawBody.trim().length > 0) {
    try {
      payload = JSON.parse(rawBody);
    } catch {
      return c.json({ status: 'error', taskType: 'EMAIL_PROCESS', error: '请求体必须是合法 JSON' }, 400);
    }
  }

  try {
    const result = await dispatchConsumerTask(c.env, 'EMAIL_PROCESS', payload);
    return c.json(result);
  } catch (error: any) {
    return c.json(
      {
        status: 'error',
        taskType: 'EMAIL_PROCESS',
        error: error?.message ?? '处理邮件队列失败',
      },
      500,
    );
  }
});

export default emailRoutes;
