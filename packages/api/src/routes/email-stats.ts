import { Hono } from 'hono';
import type { Env } from '../index';
import { findEmailStats } from '../services/emailStatsService';
import { validate } from '../utils/validation';
import { paginationQuerySchema } from '@bd2-automata/shared';
import { success } from '../utils/response';

const emailStats = new Hono<{ Bindings: Env }>()
  .get('/', validate('query', paginationQuerySchema), async (c) => {
    const pagination = c.req.valid('query');
    return c.json(success(await findEmailStats(c.env.DB, pagination)));
  });

export default emailStats;
