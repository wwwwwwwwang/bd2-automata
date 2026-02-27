import { BaseTaskHandler } from './index';
import type { Env } from '../../index';
import { tasks } from '@bd2-automata/shared';

type Task = typeof tasks.$inferSelect;

export class EventParticipateHandler extends BaseTaskHandler {
  async handle(task: Task, env: Env): Promise<any> {
    // TODO: 实现活动参与业务逻辑
    // 1. 查询所有活跃的活动
    // 2. 对每个活跃账号调用 BD2 活动参与 API
    // 3. 将结果写入 event_participation_logs
    console.log(`[EventParticipateHandler] 执行活动参与任务，载荷:`, task.payload);
    return { handler: 'EVENT_PARTICIPATE', status: 'skeleton' };
  }
}
