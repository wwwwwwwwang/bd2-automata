import { Hono } from 'hono';
import type { Env } from '../env';
import { findLogs, deleteLog } from '../services/logService';
import { validate } from '../utils/validation';
import { paginationQuerySchema } from '@bd2-automata/shared';
import { success } from '../utils/response';
import { parseId } from '../utils/id';

const taskLogs = new Hono<{ Bindings: Env }>()
  .get('/page', validate('query', paginationQuerySchema), async (c) => {
    const pagination = c.req.valid('query');
    return c.json(success(await findLogs(c.env.DB, pagination)));
  })
  .delete('/:id', async (c) => {
    const logId = parseId(c.req.param('id'), 'id');
    return c.json(success(await deleteLog(c.env.DB, logId)));
  })
  .post('/', async (c) => c.text('日志资源仅支持查询与删除，不支持新增', 405))
  .put('/:id', async (c) => c.text('日志资源仅支持查询与删除，不支持修改', 405))
  .patch('/:id', async (c) => c.text('日志资源仅支持查询与删除，不支持修改', 405));

export default taskLogs;
