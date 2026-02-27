import { BaseTaskHandler } from './index';
import type { Env } from '../../index';
import { tasks } from '@bd2-automata/shared';
import { processEmailQueue } from '../../services/emailQueueService';

type Task = typeof tasks.$inferSelect;

export class EmailProcessHandler extends BaseTaskHandler {
  async handle(task: Task, env: Env): Promise<any> {
    await processEmailQueue(env.DB, env.RESEND_API_KEY);
    return { handler: 'EMAIL_PROCESS', status: 'completed' };
  }
}
