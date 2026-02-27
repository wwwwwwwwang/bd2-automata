import { Hono } from 'hono';
import { validate } from '../utils/validation';
import { createRoleSchema, updateRoleSchema, paginationQuerySchema, z } from '@bd2-automata/shared';
import type { Env } from '../index';
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

const roles = new Hono<{ Bindings: Env }>()
  .get('/', validate('query', paginationQuerySchema), async (c) => {
    const pagination = c.req.valid('query');
    return c.json(success(await findRoles(c.env.DB, pagination)));
  })
  .get('/:id', async (c) => {
    return c.json(success(await findRoleById(c.env.DB, c.req.param('id'))));
  })
  .post('/', validate('json', createRoleSchema), async (c) => {
    const role = c.req.valid('json');
    return c.json(success(await createRole(c.env.DB, role)), 201);
  })
  .put('/:id', validate('json', updateRoleSchema), async (c) => {
    const role = c.req.valid('json');
    return c.json(success(await updateRole(c.env.DB, c.req.param('id'), role)));
  })
  .delete('/:id', async (c) => {
    return c.json(success(await deleteRole(c.env.DB, c.req.param('id'))));
  })
  .get('/:id/permissions', async (c) => {
    return c.json(success(await getRolePermissions(c.env.DB, c.req.param('id'))));
  })
  .post('/:id/permissions', validate('json', z.object({ permissionIds: z.array(z.string()) })), async (c) => {
    const roleId = c.req.param('id');
    const { permissionIds } = c.req.valid('json');
    return c.json(success(await assignPermissionsToRole(c.env.DB, roleId, permissionIds)));
  });

export default roles;
