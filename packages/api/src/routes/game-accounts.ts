import { Hono } from 'hono';
import { validate } from '../utils/validation';
import { createGameAccountSchema, updateGameAccountSchema, paginationQuerySchema } from '@bd2-automata/shared';
import type { Env } from '../env';
import { findGameAccounts, findGameAccountById, createGameAccount, updateGameAccount, deleteGameAccount } from '../services/gameAccountService';
import { performDailyAttend, performWeeklyAttend, performEventAttend, performRedeemCoupons } from '../services/bd2ActionService';
import { success } from '../utils/response';
import { parseId } from '../utils/id';

const gameAccounts = new Hono<{ Bindings: Env }>()
  .get('/page', validate('query', paginationQuerySchema), async (c) => {
    const pagination = c.req.valid('query');
    return c.json(success(await findGameAccounts(c.env.DB, pagination)));
  })
  .get('/:id', async (c) => {
    const accountId = parseId(c.req.param('id'), 'id');
    return c.json(success(await findGameAccountById(c.env.DB, accountId)));
  })
  .post('/', validate('json', createGameAccountSchema), async (c) => {
    const data = c.req.valid('json');
    return c.json(success(await createGameAccount(c.env.DB, data)), 201);
  })
  .put('/:id', validate('json', updateGameAccountSchema), async (c) => {
    const accountId = parseId(c.req.param('id'), 'id');
    const data = c.req.valid('json');
    return c.json(success(await updateGameAccount(c.env.DB, accountId, data)));
  })
  .delete('/:id', async (c) => {
    const accountId = parseId(c.req.param('id'), 'id');
    return c.json(success(await deleteGameAccount(c.env.DB, accountId)));
  });

export default gameAccounts;
