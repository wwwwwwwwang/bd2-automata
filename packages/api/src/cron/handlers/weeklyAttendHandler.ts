import { BaseTaskHandler } from './types';
import type { Env } from '../../env';
import { tasks } from '@bd2-automata/shared';

type Task = typeof tasks.$inferSelect;

export class WeeklyAttendHandler extends BaseTaskHandler {
  async handle(task: Task, env: Env): Promise<any> {
    // TODO: 实现每周签到业务逻辑
    // 1. 查询所有活跃的游戏账号
    // 2. 对每个账号调用 BD2 每周签到 API
    // 3. 将结果写入 weekly_attendance_logs
    console.log(`[WeeklyAttendHandler] 执行每周签到任务，载荷:`, task.payload);
    return { handler: 'WEEKLY_ATTEND', status: 'skeleton' };
  }
}
