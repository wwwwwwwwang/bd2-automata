import { BaseTaskHandler, Task } from './types';
import type { Env } from '../../env';
import { runEventAttendForAll } from '../../services/bd2ActionService';

export class EventParticipateHandler extends BaseTaskHandler {
  async handle(_task: Task, env: Env): Promise<unknown> {
    const result = await runEventAttendForAll(env.DB);
    console.log(`[EventParticipateHandler] 完成。总计=${result.total} 成功=${result.succeeded} 已完成=${result.alreadyCompleted} 失败=${result.failed}`);
    return result;
  }
}
