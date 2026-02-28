import { Hono } from 'hono';
import { validate } from '../utils/validation';
import { createTaskSchema, updateTaskSchema, paginationQuerySchema } from '@bd2-automata/shared';
import type { Env } from '../env';
import { findTasks, findTaskById, createTask, updateTask, deleteTask } from '../services/taskService';
import { success } from '../utils/response';
import { parseId } from '../utils/id';

const tasks = new Hono<{ Bindings: Env }>()
  .get('/page', validate('query', paginationQuerySchema), async (c) => {
    const pagination = c.req.valid('query');
    return c.json(success(await findTasks(c.env.DB, pagination)));
  })
  .get('/:id', async (c) => {
    const taskId = parseId(c.req.param('id'));
    return c.json(success(await findTaskById(c.env.DB, taskId)));
  })
  .post('/', validate('json', createTaskSchema), async (c) => {
    const data = c.req.valid('json');
    return c.json(success(await createTask(c.env.DB, data)), 201);
  })
  .put('/:id', validate('json', updateTaskSchema), async (c) => {
    const taskId = parseId(c.req.param('id'));
    const data = c.req.valid('json');
    return c.json(success(await updateTask(c.env.DB, taskId, data)));
  })
  .delete('/:id', async (c) => {
    const taskId = parseId(c.req.param('id'));
    return c.json(success(await deleteTask(c.env.DB, taskId)));
  });

export default tasks;
