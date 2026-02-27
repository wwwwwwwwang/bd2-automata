import { Hono } from 'hono';
import { validate } from '../utils/validation';
import { createPermissionSchema, updatePermissionSchema, paginationQuerySchema } from '@bd2-automata/shared';
import type { Env } from '../index';
import {
  findPermissions,
  findPermissionById,
  createPermission,
  updatePermission,
  deletePermission,
} from '../services/permissionService';
import { success } from '../utils/response';

const permissions = new Hono<{ Bindings: Env }>()
  .get('/', validate('query', paginationQuerySchema), async (c) => {
    const pagination = c.req.valid('query');
    return c.json(success(await findPermissions(c.env.DB, pagination)));
  })
  .get('/:id', async (c) => {
    return c.json(success(await findPermissionById(c.env.DB, c.req.param('id'))));
  })
  .post('/', validate('json', createPermissionSchema), async (c) => {
    const data = c.req.valid('json');
    return c.json(success(await createPermission(c.env.DB, data)), 201);
  })
  .put('/:id', validate('json', updatePermissionSchema), async (c) => {
    const data = c.req.valid('json');
    return c.json(success(await updatePermission(c.env.DB, c.req.param('id'), data)));
  })
  .delete('/:id', async (c) => {
    return c.json(success(await deletePermission(c.env.DB, c.req.param('id'))));
  });

export default permissions;
