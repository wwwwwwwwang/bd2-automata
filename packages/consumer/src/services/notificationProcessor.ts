import type { ConsumerTaskType } from '../env';

export type NotificationProcessResult = {
  status: 'ok';
  taskType: 'NOTIFICATION_SEND';
  processed: number;
  accepted: boolean;
};

export const processNotificationTask = async (_payload: unknown): Promise<NotificationProcessResult> => {
  return {
    status: 'ok',
    taskType: 'NOTIFICATION_SEND',
    processed: 1,
    accepted: true,
  };
};

export const isNotificationTaskType = (taskType: ConsumerTaskType): taskType is 'NOTIFICATION_SEND' => {
  return taskType === 'NOTIFICATION_SEND';
};
