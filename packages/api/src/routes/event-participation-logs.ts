import { Hono } from 'hono';
import { validate } from '../utils/validation';
import { paginationQuerySchema } from '@bd2-automata/shared';
import type { Env } from '../index';
import { findEventParticipationLogs } from '../services/eventParticipationLogService';
import { success } from '../utils/response';

const eventParticipationLogs = new Hono<{ Bindings: Env }>()
  .get('/', validate('query', paginationQuerySchema), async (c) => {
    const pagination = c.req.valid('query');
    return c.json(success(await findEventParticipationLogs(c.env.DB, pagination)));
  });

export default eventParticipationLogs;
