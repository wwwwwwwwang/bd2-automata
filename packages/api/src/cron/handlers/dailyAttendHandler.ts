import { BaseTaskHandler, Task } from './types';
import type { Env } from '../../env';
import { runDailyAttendForAll } from '../../services/bd2ActionService';

export class DailyAttendHandler extends BaseTaskHandler {
  async handle(_task: Task, env: Env): Promise<unknown> {
    const result = await runDailyAttendForAll(env.DB);
    console.log(`[DailyAttendHandler] 完成。总计=${result.total} 成功=${result.succeeded} 已完成=${result.alreadyCompleted} 失败=${result.failed}`);
    return result;
  }
}
