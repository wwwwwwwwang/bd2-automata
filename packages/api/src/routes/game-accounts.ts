import { Hono } from 'hono';
import { validate } from '../utils/validation';
import { createGameAccountSchema, updateGameAccountSchema, paginationQuerySchema } from '@bd2-automata/shared';
import type { Env } from '../env';
import { findGameAccounts, findGameAccountById, createGameAccount, updateGameAccount, deleteGameAccount } from '../services/gameAccountService';
import { performDailyAttend, performWeeklyAttend, performEventAttend, performRedeemCoupons } from '../services/bd2ActionService';
import { success } from '../utils/response';

const gameAccounts = new Hono<{ Bindings: Env }>()
  .get('/page', validate('query', paginationQuerySchema), async (c) => {
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
  })

  // ─── 手动触发操作 ─────────────────────────────────────────────────────────────

  /** 手动触发指定账号的日签 */
  .post('/:id/daily-attend', async (c) => {
    const account = await findGameAccountById(c.env.DB, c.req.param('id'));
    return c.json(success(await performDailyAttend(c.env.DB, account)));
  })

  /** 手动触发指定账号的周签 */
  .post('/:id/weekly-attend', async (c) => {
    const account = await findGameAccountById(c.env.DB, c.req.param('id'));
    return c.json(success(await performWeeklyAttend(c.env.DB, account)));
  })

  /** 手动触发指定账号的活动签到 */
  .post('/:id/event-attend', async (c) => {
    const account = await findGameAccountById(c.env.DB, c.req.param('id'));
    return c.json(success(await performEventAttend(c.env.DB, account)));
  })

  /** 手动触发指定账号兑换所有活跃礼包码 */
  .post('/:id/redeem-coupons', async (c) => {
    const account = await findGameAccountById(c.env.DB, c.req.param('id'));
    return c.json(success(await performRedeemCoupons(c.env.DB, account)));
  });

export default gameAccounts;
