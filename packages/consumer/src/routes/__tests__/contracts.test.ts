import { describe, expect, it, vi } from 'vitest';
import app from '../../index';

vi.mock('../../services/dispatcher', () => ({
  dispatchConsumerTask: vi.fn(),
}));

import { dispatchConsumerTask } from '../../services/dispatcher';

const createEnv = () => ({
  DB: {} as D1Database,
  SELF: { fetch: async () => new Response(null, { status: 200 }) } as unknown as Service,
  RESEND_API_KEY: 'test-key',
});

describe('consumer route contracts', () => {
  it('GET / returns health payload', async () => {
    const req = new Request('http://consumer/');
    const res = await app.fetch(req, createEnv() as any, {} as ExecutionContext);

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ status: 'ok', service: 'bd2-automata-consumer' });
  });

  it('POST /process-emails dispatches EMAIL_PROCESS and returns real result structure', async () => {
    const dispatchMock = vi.mocked(dispatchConsumerTask);
    dispatchMock.mockResolvedValueOnce({
      status: 'ok',
      taskType: 'EMAIL_PROCESS',
      processed: 3,
      sent: 2,
      failed: 1,
    } as any);

    const req = new Request('http://consumer/process-emails', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ source: 'api-cron', taskId: 123 }),
    });
    const res = await app.fetch(req, createEnv() as any, {} as ExecutionContext);

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({
      status: 'ok',
      taskType: 'EMAIL_PROCESS',
      processed: 3,
      sent: 2,
      failed: 1,
    });
    expect(dispatchMock).toHaveBeenCalledWith(expect.any(Object), 'EMAIL_PROCESS', { source: 'api-cron', taskId: 123 });
  });

  it('POST /process-emails rejects invalid json with 400', async () => {
    const req = new Request('http://consumer/process-emails', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{invalid-json}',
    });
    const res = await app.fetch(req, createEnv() as any, {} as ExecutionContext);

    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({
      status: 'error',
      taskType: 'EMAIL_PROCESS',
      error: '请求体必须是合法 JSON',
    });
  });

  it('POST /send-notification dispatches NOTIFICATION_SEND and returns result', async () => {
    const dispatchMock = vi.mocked(dispatchConsumerTask);
    dispatchMock.mockResolvedValueOnce({
      status: 'ok',
      taskType: 'NOTIFICATION_SEND',
      processed: 1,
      accepted: true,
    } as any);

    const req = new Request('http://consumer/send-notification', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ channel: 'email' }),
    });
    const res = await app.fetch(req, createEnv() as any, {} as ExecutionContext);

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({
      status: 'ok',
      taskType: 'NOTIFICATION_SEND',
      processed: 1,
      accepted: true,
    });
    expect(dispatchMock).toHaveBeenCalledWith(expect.any(Object), 'NOTIFICATION_SEND', { channel: 'email' });
  });

  it('POST /send-notification rejects invalid json with 400', async () => {
    const req = new Request('http://consumer/send-notification', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{oops}',
    });
    const res = await app.fetch(req, createEnv() as any, {} as ExecutionContext);

    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({
      status: 'error',
      taskType: 'NOTIFICATION_SEND',
      error: '请求体必须是合法 JSON',
    });
  });
});
