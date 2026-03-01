import type { ConsumerTaskType, Env } from '../env';
import { processEmailQueue } from './emailQueueProcessor';
import { processNotificationTask } from './notificationProcessor';

export type ConsumerDispatchResult = Awaited<ReturnType<typeof processEmailQueue>> | Awaited<ReturnType<typeof processNotificationTask>>;

export const dispatchConsumerTask = async (
  env: Env,
  taskType: ConsumerTaskType,
  payload?: unknown,
): Promise<ConsumerDispatchResult> => {
  if (taskType === 'EMAIL_PROCESS') {
    return processEmailQueue(env);
  }

  return processNotificationTask(payload);
};
