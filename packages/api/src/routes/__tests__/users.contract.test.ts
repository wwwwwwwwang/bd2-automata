import { beforeEach, describe, expect, it, vi } from 'vitest';
import users from '../users';

vi.mock('../../middlewares/auth', () => ({
  authMiddleware: async (_c: any, next: any) => next(),
  rbacMiddleware: async (_c: any, next: any) => next(),
}));

const serviceMocks = vi.hoisted(() => ({
  findUsers: vi.fn(),
  findUserById: vi.fn(),
  createUser: vi.fn(),
  updateUser: vi.fn(),
  deleteUser: vi.fn(),
  assignRolesToUser: vi.fn(),
  getUserRoles: vi.fn(),
}));

vi.mock('../../services/userService', () => serviceMocks);

describe('users route contracts', () => {
  const env = {
    DB: {} as D1Database,
    PERMISSION_CACHE: { get: vi.fn(), put: vi.fn() } as any,
  } as any;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('GET /page returns paginated users payload', async () => {
    const pagePayload = {
      items: [{ id: 1, username: 'u1' }],
      meta: { total: 1, page: 1, limit: 10, totalPages: 1 },
    };
    serviceMocks.findUsers.mockResolvedValue(pagePayload);

    const req = new Request('http://api/page?page=1&limit=10');
    const res = await users.fetch(req, env, {} as ExecutionContext);

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ success: true, data: pagePayload });
    expect(serviceMocks.findUsers).toHaveBeenCalledTimes(1);
  });

  it('GET /:id returns single user and uses safe-integer id', async () => {
    const user = { id: 42, username: 'demo' };
    serviceMocks.findUserById.mockResolvedValue(user);

    const req = new Request('http://api/42');
    const res = await users.fetch(req, env, {} as ExecutionContext);

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ success: true, data: user });
    expect(serviceMocks.findUserById).toHaveBeenCalledWith(env.DB, 42);
  });

  it('GET /:id rejects invalid id with 400', async () => {
    const req = new Request('http://api/not-a-number');
    const res = await users.fetch(req, env, {} as ExecutionContext);

    expect(res.status).toBe(400);
    await expect(res.text()).resolves.toBe('id 必须为数字字符串');
    expect(serviceMocks.findUserById).not.toHaveBeenCalled();
  });

  it('POST / creates user without id in payload and returns 201', async () => {
    const created = { id: 7, username: 'new-user', email: 'new@example.com' };
    serviceMocks.createUser.mockResolvedValue(created);

    const req = new Request('http://api', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        username: 'new-user',
        email: 'new@example.com',
        password: '12345678',
      }),
    });
    const res = await users.fetch(req, env, {} as ExecutionContext);

    expect(res.status).toBe(201);
    await expect(res.json()).resolves.toEqual({ success: true, data: created });
    expect(serviceMocks.createUser).toHaveBeenCalledWith(env.DB, {
      username: 'new-user',
      email: 'new@example.com',
      password: '12345678',
    });
  });

  it('PUT /:id updates user and returns updated entity', async () => {
    const updated = { id: 8, username: 'u8', email: 'u8@example.com' };
    serviceMocks.updateUser.mockResolvedValue(updated);

    const req = new Request('http://api/8', {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: 'u8@example.com', maxGameAccounts: 5 }),
    });
    const res = await users.fetch(req, env, {} as ExecutionContext);

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ success: true, data: updated });
    expect(serviceMocks.updateUser).toHaveBeenCalledWith(env.DB, 8, {
      email: 'u8@example.com',
      maxGameAccounts: 5,
    });
  });

  it('DELETE /:id returns success message', async () => {
    const deleted = { message: '用户已成功删除。' };
    serviceMocks.deleteUser.mockResolvedValue(deleted);

    const req = new Request('http://api/9', { method: 'DELETE' });
    const res = await users.fetch(req, env, {} as ExecutionContext);

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ success: true, data: deleted });
    expect(serviceMocks.deleteUser).toHaveBeenCalledWith(env.DB, 9);
  });
});
