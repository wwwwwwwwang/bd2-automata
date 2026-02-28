import { Hono } from 'hono';
import type { Env } from './env';
import healthRoutes from './routes/health';
import emailRoutes from './routes/email';
import notificationRoutes from './routes/notification';

const app = new Hono<{ Bindings: Env }>();

app.route('/', healthRoutes);
app.route('/', emailRoutes);
app.route('/', notificationRoutes);

export default app;
