import { Hono } from 'hono';
import { validate } from '../utils/validation';
import { paginationQuerySchema } from '@bd2-automata/shared';
import type { Env } from '../env';
import { findDailyAttendanceLogs } from '../services/dailyAttendanceLogService';
import { success } from '../utils/response';

const dailyAttendanceLogs = new Hono<{ Bindings: Env }>()
  .get('/page', validate('query', paginationQuerySchema), async (c) => {
    const pagination = c.req.valid('query');
    return c.json(success(await findDailyAttendanceLogs(c.env.DB, pagination)));
  });

export default dailyAttendanceLogs;
