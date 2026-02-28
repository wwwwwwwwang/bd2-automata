import { Hono } from 'hono';
import { validate } from '../utils/validation';
import { createUserSchema, updateUserSchema, paginationQuerySchema, z } from '@bd2-automata/shared';
import {
  findUsers,
  findUserById,
  createUser,
  updateUser,
  deleteUser,
  assignRolesToUser,
  getUserRoles,
} from '../services/userService';
import type { Env } from '../env';
import { success } from '../utils/response';
import { bumpAuthzCacheVersion } from '../utils/authz-cache';
import { parseId } from '../utils/id';

const users = new Hono<{ Bindings: Env }>()
  .get('/page', validate('query', paginationQuerySchema), async (c) => {
    const pagination = c.req.valid('query');
    return c.json(success(await findUsers(c.env.DB, pagination)));
  })
  .get('/:id', async (c) => {
    const userId = parseId(c.req.param('id'), 'id');
    return c.json(success(await findUserById(c.env.DB, userId)));
  })
  .post('/', validate('json', createUserSchema), async (c) => {
    const user = c.req.valid('json');
    return c.json(success(await createUser(c.env.DB, user)), 201);
  })
  .put('/:id', validate('json', updateUserSchema), async (c) => {
    const userId = parseId(c.req.param('id'), 'id');
    const user = c.req.valid('json');
    return c.json(success(await updateUser(c.env.DB, userId, user)));
  })
  .delete('/:id', async (c) => {
    const userId = parseId(c.req.param('id'), 'id');
    return c.json(success(await deleteUser(c.env.DB, userId)));
  })
  .get('/:id/roles', async (c) => {
    const userId = parseId(c.req.param('id'), 'id');
    return c.json(success(await getUserRoles(c.env.DB, userId)));
  })
  .post('/:id/roles', validate('json', z.object({ roleIds: z.array(z.string()) })), async (c) => {
    const userId = parseId(c.req.param('id'), 'id');
    const { roleIds } = c.req.valid('json');
    const parsedRoleIds = roleIds.map((roleId) => parseId(roleId, 'roleId'));
    const result = await assignRolesToUser(c.env.DB, userId, parsedRoleIds);
    await bumpAuthzCacheVersion(c.env.PERMISSION_CACHE);
    return c.json(success(result));
  });

export default users;
