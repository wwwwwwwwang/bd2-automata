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
import type { Env } from '../index';
import { success } from '../utils/response';

const users = new Hono<{ Bindings: Env }>()
  .get('/', validate('query', paginationQuerySchema), async (c) => {
    const pagination = c.req.valid('query');
    return c.json(success(await findUsers(c.env.DB, pagination)));
  })
  .get('/:id', async (c) => {
    return c.json(success(await findUserById(c.env.DB, c.req.param('id'))));
  })
  .post('/', validate('json', createUserSchema), async (c) => {
    const user = c.req.valid('json');
    return c.json(success(await createUser(c.env.DB, user)), 201);
  })
  .put('/:id', validate('json', updateUserSchema), async (c) => {
    const user = c.req.valid('json');
    return c.json(success(await updateUser(c.env.DB, c.req.param('id'), user)));
  })
  .delete('/:id', async (c) => {
    return c.json(success(await deleteUser(c.env.DB, c.req.param('id'))));
  })
  .get('/:id/roles', async (c) => {
    return c.json(success(await getUserRoles(c.env.DB, c.req.param('id'))));
  })
  .post('/:id/roles', validate('json', z.object({ roleIds: z.array(z.string()) })), async (c) => {
    const userId = c.req.param('id');
    const { roleIds } = c.req.valid('json');
    return c.json(success(await assignRolesToUser(c.env.DB, userId, roleIds)));
  });

export default users;
