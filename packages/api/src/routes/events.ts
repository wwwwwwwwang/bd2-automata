import { Hono } from 'hono';
import { validate } from '../utils/validation';
import { createEventSchema, updateEventSchema, paginationQuerySchema } from '@bd2-automata/shared';
import type { Env } from '../env';
import { findEvents, findEventById, createEvent, updateEvent, deleteEvent } from '../services/eventService';
import { success } from '../utils/response';
import { parseId } from '../utils/id';

const events = new Hono<{ Bindings: Env }>()
  .get('/page', validate('query', paginationQuerySchema), async (c) => {
    const pagination = c.req.valid('query');
    return c.json(success(await findEvents(c.env.DB, pagination)));
  })
  .get('/:id', async (c) => {
    const eventId = parseId(c.req.param('id'), 'id');
    return c.json(success(await findEventById(c.env.DB, eventId)));
  })
  .post('/', validate('json', createEventSchema), async (c) => {
    const data = c.req.valid('json');
    return c.json(success(await createEvent(c.env.DB, data)), 201);
  })
  .put('/:id', validate('json', updateEventSchema), async (c) => {
    const eventId = parseId(c.req.param('id'), 'id');
    const data = c.req.valid('json');
    return c.json(success(await updateEvent(c.env.DB, eventId, data)));
  })
  .delete('/:id', async (c) => {
    const eventId = parseId(c.req.param('id'), 'id');
    return c.json(success(await deleteEvent(c.env.DB, eventId)));
  });

export default events;
