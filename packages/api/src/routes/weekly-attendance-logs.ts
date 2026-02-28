import { Hono } from 'hono';
import { validate } from '../utils/validation';
import { paginationQuerySchema } from '@bd2-automata/shared';
import type { Env } from '../env';
import { findWeeklyAttendanceLogs } from '../services/weeklyAttendanceLogService';
import { success } from '../utils/response';

const weeklyAttendanceLogs = new Hono<{ Bindings: Env }>()
  .get('/page', validate('query', paginationQuerySchema), async (c) => {
    const pagination = c.req.valid('query');
    return c.json(success(await findWeeklyAttendanceLogs(c.env.DB, pagination)));
  });

export default weeklyAttendanceLogs;
