import { Hono } from 'hono';
import type { Env } from '../env';

const healthRoutes = new Hono<{ Bindings: Env }>();

healthRoutes.get('/', (c) => c.json({ status: 'ok', service: 'bd2-automata-consumer' }));

export default healthRoutes;
