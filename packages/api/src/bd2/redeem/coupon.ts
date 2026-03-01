/**
 * BD2 官方兑换码提交模块
 *
 * 调用 BD2 官方的 AWS Lambda 兑换端点，将兑换码绑定到指定游戏账号。
 * 需要提供游戏内的 userId（字符串形式的用户名，非数字 userIndex）。
 *
 * userId 来源：getSession() 返回值中的 userId 字段
 *              （例如 "Guest_11090136" 或游戏内设置的用户名）
 *
 * 注意事项：
 *  - 每个账号对每个兑换码只能使用一次，重复使用返回 errorCode="AlreadyUsed"
 *  - 兑换成功时响应体为空对象（statusCode 为 200）
 *  - 兑换失败时 HTTP 状态码为 400，包含 errorCode 字段
 *  - 该端点不需要 BD2 accessToken，只需 userId 即可
 */

import { createClient } from '../client';
import { BD2_COUPON_BASE_URL, BD2_APP_ID } from '../constants';
import type { CouponRedeemResponse } from './types';

const couponClient = createClient({ baseUrl: BD2_COUPON_BASE_URL });

/**
 * 向 BD2 官方兑换端点提交兑换码。
 *
 * @param userId - 游戏内用户名（从 getSession().userId 获取）
 * @param code - 兑换码字符串（从 fetchAvailableCodes() 获取的 code 字段）
 * @returns CouponRedeemResponse，兑换失败时包含 errorCode（如 "AlreadyUsed"）
 *
 * @example
 * ```ts
 * const session = await getSession(account.refreshToken, account.providerType);
 * const result = await redeemCoupon(session.userId, 'BD2RADIODARIAN');
 * if (result.errorCode === 'AlreadyUsed') {
 *   // 该账号已使用过此码，跳过
 * }
 * ```
 */
export const redeemCoupon = (userId: string, code: string): Promise<CouponRedeemResponse> =>
  couponClient.post<CouponRedeemResponse>('/coupon', {
    body: {
      appId: BD2_APP_ID, // 固定为 "bd2-live"
      userId,
      code,
    },
  });
