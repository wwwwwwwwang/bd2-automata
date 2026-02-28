import { Hono } from 'hono';
import { validate } from '../utils/validation';
import { createPermissionSchema, updatePermissionSchema, paginationQuerySchema } from '@bd2-automata/shared';
import type { Env } from '../env';
import {
  findPermissions,
  findPermissionById,
  createPermission,
  updatePermission,
  deletePermission,
} from '../services/permissionService';
import { success } from '../utils/response';
import { bumpAuthzCacheVersion } from '../utils/authz-cache';
import { parseId } from '../utils/id';

const permissions = new Hono<{ Bindings: Env }>()
  .get('/page', validate('query', paginationQuerySchema), async (c) => {
    const pagination = c.req.valid('query');
    return c.json(success(await findPermissions(c.env.DB, pagination)));
  })
  .get('/:id', async (c) => {
    const permissionId = parseId(c.req.param('id'), 'id');
    return c.json(success(await findPermissionById(c.env.DB, permissionId)));
  })
  .post('/', validate('json', createPermissionSchema), async (c) => {
    const data = c.req.valid('json');
    const result = await createPermission(c.env.DB, data);
    await bumpAuthzCacheVersion(c.env.PERMISSION_CACHE);
    return c.json(success(result), 201);
  })
  .put('/:id', validate('json', updatePermissionSchema), async (c) => {
    const permissionId = parseId(c.req.param('id'), 'id');
    const data = c.req.valid('json');
    const result = await updatePermission(c.env.DB, permissionId, data);
    await bumpAuthzCacheVersion(c.env.PERMISSION_CACHE);
    return c.json(success(result));
  })
  .delete('/:id', async (c) => {
    const permissionId = parseId(c.req.param('id'), 'id');
    const result = await deletePermission(c.env.DB, permissionId);
    await bumpAuthzCacheVersion(c.env.PERMISSION_CACHE);
    return c.json(success(result));
  });

export default permissions;
