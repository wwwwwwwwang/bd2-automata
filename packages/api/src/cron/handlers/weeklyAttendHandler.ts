import { BaseTaskHandler, Task } from './types';
import type { Env } from '../../env';
import { runWeeklyAttendForAll } from '../../services/bd2ActionService';

export class WeeklyAttendHandler extends BaseTaskHandler {
  async handle(_task: Task, env: Env): Promise<unknown> {
    const result = await runWeeklyAttendForAll(env.DB);
    console.log(`[WeeklyAttendHandler] 完成。总计=${result.total} 成功=${result.succeeded} 已完成=${result.alreadyCompleted} 失败=${result.failed}`);
    return result;
  }
}
