import { Hono } from 'hono';
import { tasks, z } from '@bd2-automata/shared';
import type { Env } from '../env';
import { success } from '../utils/response';
import { getDb } from '../db/drizzle';
import { validate } from '../utils/validation';
import { HTTPException } from 'hono/http-exception';

const VALID_TASK_TYPES = ['DAILY_ATTEND', 'WEEKLY_ATTEND', 'GIFT_CODE_REDEEM', 'EVENT_PARTICIPATE', 'EMAIL_PROCESS'] as const;

const triggerTaskSchema = z.object({
  payload: z.record(z.unknown()).optional().default({}),
});

const admin = new Hono<{ Bindings: Env }>();

admin.post('/trigger-task/:taskType', validate('json', triggerTaskSchema), async (c) => {
  const db = getDb(c.env.DB);
  const taskType = c.req.param('taskType');

  if (!(VALID_TASK_TYPES as readonly string[]).includes(taskType)) {
    throw new HTTPException(400, { message: `无效的任务类型: ${taskType}。允许的类型: ${VALID_TASK_TYPES.join(', ')}` });
  }

  const { payload } = c.req.valid('json');

  const newTask = {
    taskType,
    payload,
    status: 'pending' as const,
  };

  const [inserted] = await db.insert(tasks).values(newTask).returning();

  return c.json(success({ message: `任务 '${taskType}' 已成功触发。`, taskId: inserted.id }));
});

export default admin;
