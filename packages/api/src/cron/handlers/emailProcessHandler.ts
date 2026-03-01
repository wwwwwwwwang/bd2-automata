import { BaseTaskHandler, Task } from './types';
import type { Env } from '../../env';
import { processEmailQueue } from '../../services/emailQueueService';

const EMAIL_PROCESS_MODE_API = 'api';
const EMAIL_PROCESS_MODE_CONSUMER = 'consumer';

export class EmailProcessHandler extends BaseTaskHandler {
  async handle(task: Task, env: Env): Promise<any> {
    const mode = env.EMAIL_PROCESS_MODE ?? EMAIL_PROCESS_MODE_API;

    if (mode === EMAIL_PROCESS_MODE_CONSUMER) {
      const response = await env.CONSUMER.fetch('https://consumer/process-emails', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ source: 'api-cron', taskId: task.id }),
      });

      if (!response.ok) {
        throw new Error(`Consumer process-emails failed: ${response.status}`);
      }

      return { handler: 'EMAIL_PROCESS', status: 'delegated_to_consumer' };
    }

    await processEmailQueue(env.DB, env.RESEND_API_KEY);
    return { handler: 'EMAIL_PROCESS', status: 'completed_in_api' };
  }
}
