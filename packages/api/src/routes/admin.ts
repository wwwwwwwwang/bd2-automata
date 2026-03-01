import { Hono } from 'hono';
import { tasks, z, TASK_TYPES, type TaskType } from '@bd2-automata/shared';
import type { Env } from '../env';
import { success } from '../utils/response';
import { getDb } from '../db/drizzle';
import { validate } from '../utils/validation';
import { HTTPException } from 'hono/http-exception';

const triggerTaskSchema = z.object({
  payload: z.record(z.unknown()).optional().default({}),
});

const isValidTaskType = (value: string): value is TaskType =>
  (TASK_TYPES as readonly string[]).includes(value);

const admin = new Hono<{ Bindings: Env }>();

admin.post('/trigger-task/:taskType', validate('json', triggerTaskSchema), async (c) => {
  const db = getDb(c.env.DB);
  const taskType = c.req.param('taskType');

  if (!isValidTaskType(taskType)) {
    throw new HTTPException(400, { message: `无效的任务类型: ${taskType}。允许的类型: ${TASK_TYPES.join(', ')}` });
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
