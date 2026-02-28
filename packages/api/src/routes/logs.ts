import { Hono } from 'hono';
import type { Env } from '../env';
import { findLogs } from '../services/logService';
import { validate } from '../utils/validation';
import { paginationQuerySchema } from '@bd2-automata/shared';
import { success } from '../utils/response';

const logs = new Hono<{ Bindings: Env }>()
  .get('/page', validate('query', paginationQuerySchema), async (c) => {
    const pagination = c.req.valid('query');
    return c.json(success(await findLogs(c.env.DB, pagination)));
  });

export default logs;
