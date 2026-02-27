import { Hono } from 'hono';
import { validate } from '../utils/validation';
import { createDictionaryTypeSchema, updateDictionaryTypeSchema, paginationQuerySchema } from '@bd2-automata/shared';
import type { Env } from '../index';
import { findDictionaryTypes, findDictionaryTypeById, createDictionaryType, updateDictionaryType, deleteDictionaryType } from '../services/dictionaryTypeService';
import { success } from '../utils/response';

const dictionaryTypes = new Hono<{ Bindings: Env }>()
  .get('/', validate('query', paginationQuerySchema), async (c) => {
    const pagination = c.req.valid('query');
    return c.json(success(await findDictionaryTypes(c.env.DB, pagination)));
  })
  .get('/:id', async (c) => {
    return c.json(success(await findDictionaryTypeById(c.env.DB, c.req.param('id'))));
  })
  .post('/', validate('json', createDictionaryTypeSchema), async (c) => {
    const data = c.req.valid('json');
    return c.json(success(await createDictionaryType(c.env.DB, data)), 201);
  })
  .put('/:id', validate('json', updateDictionaryTypeSchema), async (c) => {
    const data = c.req.valid('json');
    return c.json(success(await updateDictionaryType(c.env.DB, c.req.param('id'), data)));
  })
  .delete('/:id', async (c) => {
    return c.json(success(await deleteDictionaryType(c.env.DB, c.req.param('id'))));
  });

export default dictionaryTypes;
