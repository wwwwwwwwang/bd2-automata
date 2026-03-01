/**
 * BD2 Pulse 兑换码聚合站模块
 *
 * BD2 Pulse（thebd2pulse.com）是第三方社区维护的兑换码聚合站，
 * 定期收录官方渠道发布的各类兑换码，并标注状态（active/limited/expired/permanent）。
 *
 * 该模块只负责拉取码列表，实际兑换由 coupon.ts 调用官方端点完成。
 * 使用前建议过滤掉 status="expired" 的码以减少无效请求。
 */

import { createClient } from '../client';
import { BD2_PULSE_BASE_URL, BD2_PULSE_API_KEY } from '../constants';
import type { PulseCode } from './types';

const pulseClient = createClient({
  baseUrl: BD2_PULSE_BASE_URL,
  defaultHeaders: {
    /** Pulse 站点要求的 API Key 鉴权 */
    'x-api-key': BD2_PULSE_API_KEY,
  },
});

/**
 * 获取 BD2 Pulse 聚合站上所有已知兑换码的完整列表。
 *
 * @returns PulseCode[] 包含所有状态的兑换码，调用方需自行过滤 expired 状态
 *
 * @example
 * ```ts
 * const codes = await fetchAvailableCodes();
 * const activeCodes = codes.filter(c => c.status !== 'expired');
 * ```
 */
export const fetchAvailableCodes = (): Promise<PulseCode[]> =>
  pulseClient.get<PulseCode[]>('/redeem');
