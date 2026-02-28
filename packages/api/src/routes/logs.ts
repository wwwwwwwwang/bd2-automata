import { Hono } from 'hono';
import type { Env } from '../env';
import { findLogs, deleteLog } from '../services/logService';
import { HTTPException } from 'hono/http-exception';
import { validate } from '../utils/validation';
import { paginationQuerySchema } from '@bd2-automata/shared';
import { success } from '../utils/response';

const logs = new Hono<{ Bindings: Env }>()
  .get('/page', validate('query', paginationQuerySchema), async (c) => {
    const pagination = c.req.valid('query');
    return c.json(success(await findLogs(c.env.DB, pagination)));
  })
  .delete('/:id', async (c) => c.json(success(await deleteLog(c.env.DB, c.req.param('id')))))
  .post('/', () => {
    throw new HTTPException(405, { message: '日志资源仅支持查询与删除，不支持新增' });
  })
  .put('/:id', () => {
    throw new HTTPException(405, { message: '日志资源仅支持查询与删除，不支持修改' });
  })
  .patch('/:id', () => {
    throw new HTTPException(405, { message: '日志资源仅支持查询与删除，不支持修改' });
  });

export default logs;
