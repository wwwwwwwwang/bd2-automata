import { Hono } from 'hono';
import type { Env } from '../env';
import { findEmailQueue } from '../services/emailQueueService';
import { validate } from '../utils/validation';
import { paginationQuerySchema } from '@bd2-automata/shared';
import { success } from '../utils/response';

const emailQueue = new Hono<{ Bindings: Env }>()
  .get('/page', validate('query', paginationQuerySchema), async (c) => {
    const pagination = c.req.valid('query');
    return c.json(success(await findEmailQueue(c.env.DB, pagination)));
  });

export default emailQueue;
