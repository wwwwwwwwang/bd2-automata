import { beforeEach, describe, expect, it, vi } from 'vitest';
import { EmailProcessHandler } from '../emailProcessHandler';
import { processEmailQueue } from '../../../services/emailQueueService';

vi.mock('../../../services/emailQueueService', () => ({
  processEmailQueue: vi.fn(),
}));

describe('EmailProcessHandler', () => {
  const handler = new EmailProcessHandler();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const createTask = () => ({
    id: 123,
    taskType: 'EMAIL_PROCESS',
    payload: {},
  }) as any;

  it('processes emails in api mode by default', async () => {
    const processEmailQueueMock = vi.mocked(processEmailQueue);
    processEmailQueueMock.mockResolvedValue(undefined as any);

    const consumerFetch = vi.fn();
    const env = {
      DB: {} as D1Database,
      CONSUMER: { fetch: consumerFetch } as unknown as Service,
      RESEND_API_KEY: 'test-api-key',
      JWT_SECRET: 'jwt',
      PERMISSION_CACHE: {} as KVNamespace,
      RESEND_WEBHOOK_SECRET: 'secret',
      CORS_ORIGIN: '*',
    } as any;

    const result = await handler.handle(createTask(), env);

    expect(processEmailQueueMock).toHaveBeenCalledTimes(1);
    expect(processEmailQueueMock).toHaveBeenCalledWith(env.DB, env.RESEND_API_KEY);
    expect(consumerFetch).not.toHaveBeenCalled();
    expect(result).toEqual({ handler: 'EMAIL_PROCESS', status: 'completed_in_api' });
  });

  it('delegates to consumer in consumer mode', async () => {
    const processEmailQueueMock = vi.mocked(processEmailQueue);
    processEmailQueueMock.mockResolvedValue(undefined as any);

    const consumerFetch = vi.fn().mockResolvedValue({ ok: true, status: 200 });
    const env = {
      DB: {} as D1Database,
      CONSUMER: { fetch: consumerFetch } as unknown as Service,
      EMAIL_PROCESS_MODE: 'consumer',
      RESEND_API_KEY: 'test-api-key',
      JWT_SECRET: 'jwt',
      PERMISSION_CACHE: {} as KVNamespace,
      RESEND_WEBHOOK_SECRET: 'secret',
      CORS_ORIGIN: '*',
    } as any;

    const result = await handler.handle(createTask(), env);

    expect(consumerFetch).toHaveBeenCalledTimes(1);
    expect(consumerFetch).toHaveBeenCalledWith('https://consumer/process-emails', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ source: 'api-cron', taskId: 123 }),
    });
    expect(processEmailQueueMock).not.toHaveBeenCalled();
    expect(result).toEqual({ handler: 'EMAIL_PROCESS', status: 'delegated_to_consumer' });
  });

  it('throws when consumer delegation fails', async () => {
    const processEmailQueueMock = vi.mocked(processEmailQueue);
    processEmailQueueMock.mockResolvedValue(undefined as any);

    const consumerFetch = vi.fn().mockResolvedValue({ ok: false, status: 500 });
    const env = {
      DB: {} as D1Database,
      CONSUMER: { fetch: consumerFetch } as unknown as Service,
      EMAIL_PROCESS_MODE: 'consumer',
      RESEND_API_KEY: 'test-api-key',
      JWT_SECRET: 'jwt',
      PERMISSION_CACHE: {} as KVNamespace,
      RESEND_WEBHOOK_SECRET: 'secret',
      CORS_ORIGIN: '*',
    } as any;

    await expect(handler.handle(createTask(), env)).rejects.toThrow('Consumer process-emails failed: 500');
    expect(processEmailQueueMock).not.toHaveBeenCalled();
  });
});
