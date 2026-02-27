import { Hono } from 'hono';
import { validate } from '../utils/validation';
import { createEmailTemplateSchema, updateEmailTemplateSchema, paginationQuerySchema } from '@bd2-automata/shared';
import type { Env } from '../index';
import { findEmailTemplates, findEmailTemplateById, createEmailTemplate, updateEmailTemplate, deleteEmailTemplate } from '../services/emailTemplateService';
import { success } from '../utils/response';

const emailTemplates = new Hono<{ Bindings: Env }>()
  .get('/', validate('query', paginationQuerySchema), async (c) => {
    const pagination = c.req.valid('query');
    return c.json(success(await findEmailTemplates(c.env.DB, pagination)));
  })
  .get('/:id', async (c) => {
    return c.json(success(await findEmailTemplateById(c.env.DB, c.req.param('id'))));
  })
  .post('/', validate('json', createEmailTemplateSchema), async (c) => {
    const data = c.req.valid('json');
    return c.json(success(await createEmailTemplate(c.env.DB, data)), 201);
  })
  .put('/:id', validate('json', updateEmailTemplateSchema), async (c) => {
    const data = c.req.valid('json');
    return c.json(success(await updateEmailTemplate(c.env.DB, c.req.param('id'), data)));
  })
  .delete('/:id', async (c) => {
    return c.json(success(await deleteEmailTemplate(c.env.DB, c.req.param('id'))));
  });

export default emailTemplates;
