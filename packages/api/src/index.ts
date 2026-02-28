import { app } from './app';
import { scheduled } from './cron/scheduled';

export type { Env } from './env';
export type { AppType } from './app';

export default {
  fetch: app.fetch,
  scheduled,
};

