import { Hono } from 'hono';
import { validate } from '../utils/validation';
import { createDictionaryItemSchema, updateDictionaryItemSchema, paginationQuerySchema } from '@bd2-automata/shared';
import type { Env } from '../env';
import { findDictionaryItems, findDictionaryItemById, createDictionaryItem, updateDictionaryItem, deleteDictionaryItem } from '../services/dictionaryItemService';
import { success } from '../utils/response';

const dictionaryItems = new Hono<{ Bindings: Env }>()
  .get('/page', validate('query', paginationQuerySchema), async (c) => {
    const pagination = c.req.valid('query');
    return c.json(success(await findDictionaryItems(c.env.DB, pagination)));
  })
  .get('/:id', async (c) => {
    return c.json(success(await findDictionaryItemById(c.env.DB, c.req.param('id'))));
  })
  .post('/', validate('json', createDictionaryItemSchema), async (c) => {
    const data = c.req.valid('json');
    return c.json(success(await createDictionaryItem(c.env.DB, data)), 201);
  })
  .put('/:id', validate('json', updateDictionaryItemSchema), async (c) => {
    const data = c.req.valid('json');
    return c.json(success(await updateDictionaryItem(c.env.DB, c.req.param('id'), data)));
  })
  .delete('/:id', async (c) => {
    return c.json(success(await deleteDictionaryItem(c.env.DB, c.req.param('id'))));
  });

export default dictionaryItems;
