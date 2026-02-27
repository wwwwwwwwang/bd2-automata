import { Env } from '../../index';
import { tasks } from '@bd2-automata/shared';
import { DailyAttendHandler } from './dailyAttendHandler';
import { WeeklyAttendHandler } from './weeklyAttendHandler';
import { GiftCodeRedeemHandler } from './giftCodeRedeemHandler';
import { EventParticipateHandler } from './eventParticipateHandler';
import { EmailProcessHandler } from './emailProcessHandler';

type Task = typeof tasks.$inferSelect;

export abstract class BaseTaskHandler {
  async canExecute(task: Task, env: Env): Promise<boolean> {
    return true;
  }

  abstract handle(task: Task, env: Env): Promise<any>;
}

const handlerMap: Record<string, BaseTaskHandler> = {
  DAILY_ATTEND: new DailyAttendHandler(),
  WEEKLY_ATTEND: new WeeklyAttendHandler(),
  GIFT_CODE_REDEEM: new GiftCodeRedeemHandler(),
  EVENT_PARTICIPATE: new EventParticipateHandler(),
  EMAIL_PROCESS: new EmailProcessHandler(),
};

export async function dispatchToHandler(task: Task, env: Env): Promise<void> {
  const handler = handlerMap[task.taskType];

  if (!handler) {
    throw new Error(`No handler found for task type: ${task.taskType}`);
  }

  const canRun = await handler.canExecute(task, env);
  if (!canRun) {
    throw new Error(`任务 ${task.id} (${task.taskType}) 前置检查未通过，跳过执行。`);
  }

  await handler.handle(task, env);
}
