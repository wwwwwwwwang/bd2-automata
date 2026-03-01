import { BaseTaskHandler, Task } from './types';
import type { Env } from '../../env';
import { runRedeemCouponsForAll } from '../../services/bd2ActionService';

export class GiftCodeRedeemHandler extends BaseTaskHandler {
  async handle(_task: Task, env: Env): Promise<unknown> {
    const result = await runRedeemCouponsForAll(env.DB);
    console.log(`[GiftCodeRedeemHandler] 完成。总计=${result.total} 成功=${result.succeeded} 已完成=${result.alreadyCompleted} 失败=${result.failed}`);
    return result;
  }
}
