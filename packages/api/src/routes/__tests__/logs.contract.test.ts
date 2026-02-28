import { beforeEach, describe, expect, it, vi } from 'vitest';
import logs from '../logs';

vi.mock('../../middlewares/auth', () => ({
  authMiddleware: async (_c: any, next: any) => next(),
  rbacMiddleware: async (_c: any, next: any) => next(),
}));

const serviceMocks = vi.hoisted(() => ({
  findLogs: vi.fn(),
  deleteLog: vi.fn(),
}));

vi.mock('../../services/logService', () => serviceMocks);

describe('logs route contracts', () => {
  const env = {
    DB: {} as D1Database,
  } as any;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('GET /page returns paginated logs payload', async () => {
    const pagePayload = {
      items: [{ id: 1, message: 'ok' }],
      meta: { total: 1, page: 1, limit: 10, totalPages: 1 },
    };
    serviceMocks.findLogs.mockResolvedValue(pagePayload);

    const req = new Request('http://api/page?page=1&limit=10');
    const res = await logs.fetch(req, env, {} as ExecutionContext);

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ success: true, data: pagePayload });
    expect(serviceMocks.findLogs).toHaveBeenCalledTimes(1);
  });

  it('DELETE /:id deletes log and returns success message', async () => {
    const deleted = { message: '日志已成功删除。' };
    serviceMocks.deleteLog.mockResolvedValue(deleted);

    const req = new Request('http://api/9', { method: 'DELETE' });
    const res = await logs.fetch(req, env, {} as ExecutionContext);

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ success: true, data: deleted });
    expect(serviceMocks.deleteLog).toHaveBeenCalledWith(env.DB, 9);
  });

  it('DELETE /:id rejects invalid id with 400', async () => {
    const req = new Request('http://api/not-a-number', { method: 'DELETE' });
    const res = await logs.fetch(req, env, {} as ExecutionContext);

    expect(res.status).toBe(400);
    await expect(res.text()).resolves.toBe('id 必须为数字字符串');
    expect(serviceMocks.deleteLog).not.toHaveBeenCalled();
  });

  it('POST / is rejected with identifiable error', async () => {
    const req = new Request('http://api', { method: 'POST' });
    const res = await logs.fetch(req, env, {} as ExecutionContext);

    expect(res.status).toBe(405);
    await expect(res.text()).resolves.toBe('日志资源仅支持查询与删除，不支持新增');
  });

  it('PUT /:id is rejected with identifiable error', async () => {
    const req = new Request('http://api/1', { method: 'PUT' });
    const res = await logs.fetch(req, env, {} as ExecutionContext);

    expect(res.status).toBe(405);
    await expect(res.text()).resolves.toBe('日志资源仅支持查询与删除，不支持修改');
  });

  it('PATCH /:id is rejected with identifiable error', async () => {
    const req = new Request('http://api/1', { method: 'PATCH' });
    const res = await logs.fetch(req, env, {} as ExecutionContext);

    expect(res.status).toBe(405);
    await expect(res.text()).resolves.toBe('日志资源仅支持查询与删除，不支持修改');
  });
});
