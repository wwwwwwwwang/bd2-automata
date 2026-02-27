import { Hono } from 'hono';
import { validate } from '../utils/validation';
import { createTaskSchema, updateTaskSchema, paginationQuerySchema } from '@bd2-automata/shared';
import type { Env } from '../index';
import { findTasks, findTaskById, createTask, updateTask, deleteTask } from '../services/taskService';
import { success } from '../utils/response';

const tasks = new Hono<{ Bindings: Env }>()
  .get('/', validate('query', paginationQuerySchema), async (c) => {
    const pagination = c.req.valid('query');
    return c.json(success(await findTasks(c.env.DB, pagination)));
  })
  .get('/:id', async (c) => {
    return c.json(success(await findTaskById(c.env.DB, c.req.param('id'))));
  })
  .post('/', validate('json', createTaskSchema), async (c) => {
    const data = c.req.valid('json');
    return c.json(success(await createTask(c.env.DB, data)), 201);
  })
  .put('/:id', validate('json', updateTaskSchema), async (c) => {
    const data = c.req.valid('json');
    return c.json(success(await updateTask(c.env.DB, c.req.param('id'), data)));
  })
  .delete('/:id', async (c) => {
    return c.json(success(await deleteTask(c.env.DB, c.req.param('id'))));
  });

export default tasks;
