import { Hono } from 'hono';
import { validate } from '../utils/validation';
import { createRoleSchema, updateRoleSchema, paginationQuerySchema, z } from '@bd2-automata/shared';
import type { Env } from '../env';
import {
  findRoles,
  findRoleById,
  createRole,
  updateRole,
  deleteRole,
  assignPermissionsToRole,
  getRolePermissions,
} from '../services/roleService';
import { success } from '../utils/response';
import { bumpAuthzCacheVersion } from '../utils/authz-cache';
import { parseId } from '../utils/id';

const roles = new Hono<{ Bindings: Env }>()
  .get('/page', validate('query', paginationQuerySchema), async (c) => {
    const pagination = c.req.valid('query');
    return c.json(success(await findRoles(c.env.DB, pagination)));
  })
  .get('/:id', async (c) => {
    const roleId = c.req.param('id');
    parseId(roleId, 'id');
    return c.json(success(await findRoleById(c.env.DB, roleId)));
  })
  .post('/', validate('json', createRoleSchema), async (c) => {
    const role = c.req.valid('json');
    const result = await createRole(c.env.DB, role);
    await bumpAuthzCacheVersion(c.env.PERMISSION_CACHE);
    return c.json(success(result), 201);
  })
  .put('/:id', validate('json', updateRoleSchema), async (c) => {
    const roleId = c.req.param('id');
    parseId(roleId, 'id');
    const role = c.req.valid('json');
    const result = await updateRole(c.env.DB, roleId, role);
    await bumpAuthzCacheVersion(c.env.PERMISSION_CACHE);
    return c.json(success(result));
  })
  .delete('/:id', async (c) => {
    const roleId = c.req.param('id');
    parseId(roleId, 'id');
    const result = await deleteRole(c.env.DB, roleId);
    await bumpAuthzCacheVersion(c.env.PERMISSION_CACHE);
    return c.json(success(result));
  })
  .get('/:id/permissions', async (c) => {
    const roleId = c.req.param('id');
    parseId(roleId, 'id');
    return c.json(success(await getRolePermissions(c.env.DB, roleId)));
  })
  .post('/:id/permissions', validate('json', z.object({ permissionIds: z.array(z.string()) })), async (c) => {
    const roleId = c.req.param('id');
    parseId(roleId, 'id');
    const { permissionIds } = c.req.valid('json');
    permissionIds.forEach((permissionId) => parseId(permissionId, 'permissionId'));
    const result = await assignPermissionsToRole(c.env.DB, roleId, permissionIds);
    await bumpAuthzCacheVersion(c.env.PERMISSION_CACHE);
    return c.json(success(result));
  });

export default roles;
