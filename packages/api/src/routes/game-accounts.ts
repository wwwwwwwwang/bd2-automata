import { Hono } from 'hono';
import { validate } from '../utils/validation';
import { createGameAccountSchema, updateGameAccountSchema, paginationQuerySchema } from '@bd2-automata/shared';
import type { Env } from '../index';
import { findGameAccounts, findGameAccountById, createGameAccount, updateGameAccount, deleteGameAccount } from '../services/gameAccountService';
import { success } from '../utils/response';

const gameAccounts = new Hono<{ Bindings: Env }>()
  .get('/', validate('query', paginationQuerySchema), async (c) => {
    const pagination = c.req.valid('query');
    return c.json(success(await findGameAccounts(c.env.DB, pagination)));
  })
  .get('/:id', async (c) => {
    return c.json(success(await findGameAccountById(c.env.DB, c.req.param('id'))));
  })
  .post('/', validate('json', createGameAccountSchema), async (c) => {
    const data = c.req.valid('json');
    return c.json(success(await createGameAccount(c.env.DB, data)), 201);
  })
  .put('/:id', validate('json', updateGameAccountSchema), async (c) => {
    const data = c.req.valid('json');
    return c.json(success(await updateGameAccount(c.env.DB, c.req.param('id'), data)));
  })
  .delete('/:id', async (c) => {
    return c.json(success(await deleteGameAccount(c.env.DB, c.req.param('id'))));
  });

export default gameAccounts;
