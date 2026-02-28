import { describe, expect, it } from 'vitest';
import app from '../../index';

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

  it('POST /process-emails returns placeholder processed payload', async () => {
    const req = new Request('http://consumer/process-emails', { method: 'POST' });
    const res = await app.fetch(req, createEnv() as any, {} as ExecutionContext);

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ status: 'ok', processed: 0 });
  });

  it('POST /send-notification returns placeholder status payload', async () => {
    const req = new Request('http://consumer/send-notification', { method: 'POST' });
    const res = await app.fetch(req, createEnv() as any, {} as ExecutionContext);

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ status: 'ok' });
  });
});
