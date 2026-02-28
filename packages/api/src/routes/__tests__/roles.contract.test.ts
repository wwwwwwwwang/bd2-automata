import { beforeEach, describe, expect, it, vi } from 'vitest';
import roles from '../roles';

vi.mock('../../middlewares/auth', () => ({
  authMiddleware: async (_c: any, next: any) => next(),
  rbacMiddleware: async (_c: any, next: any) => next(),
}));

const serviceMocks = vi.hoisted(() => ({
  findRoles: vi.fn(),
  findRoleById: vi.fn(),
  createRole: vi.fn(),
  updateRole: vi.fn(),
  deleteRole: vi.fn(),
  assignPermissionsToRole: vi.fn(),
  getRolePermissions: vi.fn(),
}));

vi.mock('../../services/roleService', () => serviceMocks);

describe('roles route contracts', () => {
  const env = {
    DB: {} as D1Database,
    PERMISSION_CACHE: { get: vi.fn(), put: vi.fn() } as any,
  } as any;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('GET /page returns paginated roles payload', async () => {
    const pagePayload = {
      items: [{ id: 1, name: 'admin' }],
      meta: { total: 1, page: 1, limit: 10, totalPages: 1 },
    };
    serviceMocks.findRoles.mockResolvedValue(pagePayload);

    const req = new Request('http://api/page?page=1&limit=10');
    const res = await roles.fetch(req, env, {} as ExecutionContext);

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ success: true, data: pagePayload });
    expect(serviceMocks.findRoles).toHaveBeenCalledTimes(1);
  });

  it('GET /:id returns single role and uses safe-integer id', async () => {
    const role = { id: 42, name: 'admin' };
    serviceMocks.findRoleById.mockResolvedValue(role);

    const req = new Request('http://api/42');
    const res = await roles.fetch(req, env, {} as ExecutionContext);

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ success: true, data: role });
    expect(serviceMocks.findRoleById).toHaveBeenCalledWith(env.DB, 42);
  });

  it('GET /:id rejects invalid id with 400', async () => {
    const req = new Request('http://api/not-a-number');
    const res = await roles.fetch(req, env, {} as ExecutionContext);

    expect(res.status).toBe(400);
    await expect(res.text()).resolves.toBe('id 必须为数字字符串');
    expect(serviceMocks.findRoleById).not.toHaveBeenCalled();
  });

  it('POST / creates role without id in payload and returns 201', async () => {
    const created = { id: 7, name: 'operator', description: '操作员' };
    serviceMocks.createRole.mockResolvedValue(created);

    const req = new Request('http://api', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        name: 'operator',
        description: '操作员',
      }),
    });
    const res = await roles.fetch(req, env, {} as ExecutionContext);

    expect(res.status).toBe(201);
    await expect(res.json()).resolves.toEqual({ success: true, data: created });
    expect(serviceMocks.createRole).toHaveBeenCalledWith(env.DB, {
      name: 'operator',
      description: '操作员',
    });
  });

  it('PUT /:id updates role and returns updated entity', async () => {
    const updated = { id: 8, name: 'operator', description: '更新后的描述', isActive: false };
    serviceMocks.updateRole.mockResolvedValue(updated);

    const req = new Request('http://api/8', {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ description: '更新后的描述', isActive: false }),
    });
    const res = await roles.fetch(req, env, {} as ExecutionContext);

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ success: true, data: updated });
    expect(serviceMocks.updateRole).toHaveBeenCalledWith(env.DB, 8, {
      description: '更新后的描述',
      isActive: false,
    });
  });

  it('GET /:id/permissions returns role permissions list', async () => {
    const permissions = [{ id: 1, code: 'user:read' }];
    serviceMocks.getRolePermissions.mockResolvedValue(permissions);

    const req = new Request('http://api/5/permissions');
    const res = await roles.fetch(req, env, {} as ExecutionContext);

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ success: true, data: permissions });
    expect(serviceMocks.getRolePermissions).toHaveBeenCalledWith(env.DB, 5);
  });

  it('POST /:id/permissions assigns permissions with parsed permissionIds', async () => {
    const assigned = { message: '权限已成功分配。' };
    serviceMocks.assignPermissionsToRole.mockResolvedValue(assigned);

    const req = new Request('http://api/5/permissions', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ permissionIds: ['9', '11'] }),
    });
    const res = await roles.fetch(req, env, {} as ExecutionContext);

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ success: true, data: assigned });
    expect(serviceMocks.assignPermissionsToRole).toHaveBeenCalledWith(env.DB, 5, [9, 11]);
  });

  it('POST /:id/permissions rejects invalid permissionId with 400', async () => {
    const req = new Request('http://api/5/permissions', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ permissionIds: ['oops'] }),
    });
    const res = await roles.fetch(req, env, {} as ExecutionContext);

    expect(res.status).toBe(400);
    await expect(res.text()).resolves.toBe('permissionId 必须为数字字符串');
    expect(serviceMocks.assignPermissionsToRole).not.toHaveBeenCalled();
  });

  it('DELETE /:id returns success message', async () => {
    const deleted = { message: '角色已成功删除。' };
    serviceMocks.deleteRole.mockResolvedValue(deleted);

    const req = new Request('http://api/9', { method: 'DELETE' });
    const res = await roles.fetch(req, env, {} as ExecutionContext);

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ success: true, data: deleted });
    expect(serviceMocks.deleteRole).toHaveBeenCalledWith(env.DB, 9);
  });
});
