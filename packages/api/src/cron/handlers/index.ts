import { TASK_TYPES } from '@bd2-automata/shared';
import type { Env } from '../../env';
import type { Task, BaseTaskHandler, TaskType } from './types';
import { DailyAttendHandler } from './dailyAttendHandler';
import { WeeklyAttendHandler } from './weeklyAttendHandler';
import { GiftCodeRedeemHandler } from './giftCodeRedeemHandler';
import { EventParticipateHandler } from './eventParticipateHandler';
import { EmailProcessHandler } from './emailProcessHandler';

const isTaskType = (value: string): value is TaskType =>
  (TASK_TYPES as readonly string[]).includes(value);

const handlerMap: Record<TaskType, BaseTaskHandler> = {
  DAILY_ATTEND: new DailyAttendHandler(),
  WEEKLY_ATTEND: new WeeklyAttendHandler(),
  GIFT_CODE_REDEEM: new GiftCodeRedeemHandler(),
  EVENT_PARTICIPATE: new EventParticipateHandler(),
  EMAIL_PROCESS: new EmailProcessHandler(),
};

export async function dispatchToHandler(task: Task, env: Env): Promise<void> {
  if (!isTaskType(task.taskType)) {
    throw new Error(`No handler found for task type: ${task.taskType}`);
  }

  const handler = handlerMap[task.taskType];

  const canRun = await handler.canExecute(task, env);
  if (!canRun) {
    throw new Error(`任务 ${task.id} (${task.taskType}) 前置检查未通过，跳过执行。`);
  }

  await handler.handle(task, env);
}
