import { beforeEach, describe, expect, it, vi } from 'vitest';

const verifyMock = vi.hoisted(() => vi.fn());
const handleResendWebhookMock = vi.hoisted(() => vi.fn());
const isResendEmailStatusEventMock = vi.hoisted(() => vi.fn());

vi.mock('resend', () => ({
  Resend: vi.fn().mockImplementation(() => ({
    webhooks: {
      verify: verifyMock,
    },
  })),
}));

vi.mock('../../services/webhookService', () => ({
  handleResendWebhook: handleResendWebhookMock,
  isResendEmailStatusEvent: isResendEmailStatusEventMock,
}));

import webhooks from '../webhooks';

describe('webhooks route contracts', () => {
  const env = {
    DB: {} as D1Database,
    RESEND_API_KEY: 'test-api-key',
    RESEND_WEBHOOK_SECRET: 'test-secret',
  } as any;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('POST /status returns 400 when signature verify fails', async () => {
    verifyMock.mockImplementationOnce(() => {
      throw new Error('invalid signature');
    });

    const req = new Request('http://api/status', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'svix-id': 'id-1',
        'svix-timestamp': '1234567890',
        'svix-signature': 'bad-signature',
      },
      body: JSON.stringify({ any: 'payload' }),
    });

    const res = await webhooks.fetch(req, env, {} as ExecutionContext);

    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({ error: 'Invalid signature' });
    expect(handleResendWebhookMock).not.toHaveBeenCalled();
  });

  it('POST /status returns 200 for non-target event', async () => {
    const event = { type: 'something.else', data: { email_id: 'email_1' } };
    verifyMock.mockReturnValueOnce(event);
    isResendEmailStatusEventMock.mockReturnValueOnce(false);

    const req = new Request('http://api/status', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'svix-id': 'id-2',
        'svix-timestamp': '1234567891',
        'svix-signature': 'ok-signature',
      },
      body: JSON.stringify({ type: 'something.else' }),
    });

    const res = await webhooks.fetch(req, env, {} as ExecutionContext);

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ received: true });
    expect(isResendEmailStatusEventMock).toHaveBeenCalledWith(event);
    expect(handleResendWebhookMock).not.toHaveBeenCalled();
  });

  it('POST /status returns 200 for target event after successful handling', async () => {
    const event = { type: 'email.delivered', data: { email_id: 'email_2' } };
    verifyMock.mockReturnValueOnce(event);
    isResendEmailStatusEventMock.mockReturnValueOnce(true);
    handleResendWebhookMock.mockResolvedValueOnce(undefined);

    const req = new Request('http://api/status', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'svix-id': 'id-3',
        'svix-timestamp': '1234567892',
        'svix-signature': 'ok-signature',
      },
      body: JSON.stringify({ type: 'email.delivered', data: { email_id: 'email_2' } }),
    });

    const res = await webhooks.fetch(req, env, {} as ExecutionContext);

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ received: true });
    expect(handleResendWebhookMock).toHaveBeenCalledWith(env.DB, event);
  });

  it('POST /status propagates internal errors as 500 at app level', async () => {
    const event = { type: 'email.failed', data: { email_id: 'email_3' } };
    verifyMock.mockReturnValueOnce(event);
    isResendEmailStatusEventMock.mockReturnValueOnce(true);
    handleResendWebhookMock.mockRejectedValueOnce(new Error('db failed'));

    const appModule = await import('../../app');
    const app = appModule.app;

    const req = new Request('http://api/api/webhooks/resend/status', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'svix-id': 'id-4',
        'svix-timestamp': '1234567893',
        'svix-signature': 'ok-signature',
      },
      body: JSON.stringify({ type: 'email.failed', data: { email_id: 'email_3' } }),
    });

    const res = await app.fetch(req, {
      ...env,
      CORS_ORIGIN: '*',
      JWT_SECRET: 'jwt',
      PERMISSION_CACHE: { get: vi.fn(), put: vi.fn() },
      CONSUMER: { fetch: vi.fn() },
      EMAIL_PROCESS_MODE: 'api',
    } as any, {} as ExecutionContext);

    expect(res.status).toBe(500);
    await expect(res.json()).resolves.toEqual({ success: false, error: 'Internal Server Error' });
  });
});
