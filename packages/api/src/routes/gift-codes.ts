import { Hono } from 'hono';
import { validate } from '../utils/validation';
import { createGiftCodeSchema, updateGiftCodeSchema, paginationQuerySchema } from '@bd2-automata/shared';
import type { Env } from '../env';
import { findGiftCodes, findGiftCodeById, createGiftCode, updateGiftCode, deleteGiftCode } from '../services/giftCodeService';
import { success } from '../utils/response';

const giftCodes = new Hono<{ Bindings: Env }>()
  .get('/page', validate('query', paginationQuerySchema), async (c) => {
    const pagination = c.req.valid('query');
    return c.json(success(await findGiftCodes(c.env.DB, pagination)));
  })
  .get('/:id', async (c) => {
    return c.json(success(await findGiftCodeById(c.env.DB, c.req.param('id'))));
  })
  .post('/', validate('json', createGiftCodeSchema), async (c) => {
    const data = c.req.valid('json');
    return c.json(success(await createGiftCode(c.env.DB, data)), 201);
  })
  .put('/:id', validate('json', updateGiftCodeSchema), async (c) => {
    const data = c.req.valid('json');
    return c.json(success(await updateGiftCode(c.env.DB, c.req.param('id'), data)));
  })
  .delete('/:id', async (c) => {
    return c.json(success(await deleteGiftCode(c.env.DB, c.req.param('id'))));
  });

export default giftCodes;
