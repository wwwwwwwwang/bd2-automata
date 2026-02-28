import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Env } from '../../../env';
import { dispatchToHandler } from '../index';
import { processEmailQueue } from '../../../services/emailQueueService';

vi.mock('../../../services/emailQueueService', () => ({
  processEmailQueue: vi.fn(),
}));

describe('dispatchToHandler contract for EMAIL_PROCESS', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const createTask = () => ({
    id: 789,
    taskType: 'EMAIL_PROCESS',
    payload: {},
    status: 'pending',
    retryCount: 0,
    maxRetries: 3,
  }) as any;

  const createEnv = (mode: 'api' | 'consumer'): Env => ({
    DB: {} as D1Database,
    CONSUMER: { fetch: vi.fn().mockResolvedValue({ ok: true, status: 200 }) } as unknown as Service,
    EMAIL_PROCESS_MODE: mode,
    JWT_SECRET: 'jwt',
    PERMISSION_CACHE: {} as KVNamespace,
    RESEND_API_KEY: 'key',
    RESEND_WEBHOOK_SECRET: 'secret',
    CORS_ORIGIN: '*',
  });

  it('keeps EMAIL_PROCESS dispatch executable in api mode', async () => {
    const processEmailQueueMock = vi.mocked(processEmailQueue);
    processEmailQueueMock.mockResolvedValue(undefined as any);

    await expect(dispatchToHandler(createTask(), createEnv('api'))).resolves.toBeUndefined();
    expect(processEmailQueueMock).toHaveBeenCalledTimes(1);
  });

  it('keeps EMAIL_PROCESS dispatch executable in consumer mode', async () => {
    const processEmailQueueMock = vi.mocked(processEmailQueue);
    processEmailQueueMock.mockResolvedValue(undefined as any);

    await expect(dispatchToHandler(createTask(), createEnv('consumer'))).resolves.toBeUndefined();
    expect(processEmailQueueMock).not.toHaveBeenCalled();
  });
});
