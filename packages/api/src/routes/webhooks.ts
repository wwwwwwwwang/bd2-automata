import { Hono } from 'hono';
import { Resend } from 'resend';
import type { Env } from '../env';
import { handleResendWebhook, isResendEmailStatusEvent } from '../services/webhookService';


const webhooks = new Hono<{ Bindings: Env }>()
  .post('/status', async (c) => {
    const payload = await c.req.text();
    const resend = new Resend(c.env.RESEND_API_KEY);

    let event;
    try {
      event = resend.webhooks.verify({
        payload,
        headers: {
          id: c.req.header('svix-id') ?? '',
          timestamp: c.req.header('svix-timestamp') ?? '',
          signature: c.req.header('svix-signature') ?? '',
        },
        webhookSecret: c.env.RESEND_WEBHOOK_SECRET,
      });
    } catch {
      return c.json({ error: 'Invalid signature' }, 400);
    }

    if (!isResendEmailStatusEvent(event)) {
      return c.json({ received: true }, 200);
    }

    await handleResendWebhook(c.env.DB, event);
    return c.json({ received: true }, 200);
  });

export default webhooks;
