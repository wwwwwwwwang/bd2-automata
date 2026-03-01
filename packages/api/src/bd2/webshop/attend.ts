/**
 * BD2 Web 商店常规签到模块
 *
 * 提供日签和周签两个函数，对应 POST /api/attend 接口的 type 参数：
 *  - type=0：日签，每天可领 10 钻石
 *  - type=1：周签，每周可领 3 抽券
 *
 * 两个接口均需携带 BD2 accessToken（通过 getSession 获取）。
 * 重复签到时接口仍返回 200，但 data.success=false、data.errorType=3。
 */

import { createClient } from '../client';
import { BD2_WEBSHOP_BASE_URL } from '../constants';
import type { AttendResponse } from './types';

/**
 * 为指定 accessToken 创建带鉴权 header 的 webshop 客户端。
 * 每次调用时创建，以支持不同账号的并发请求。
 */
const makeClient = (accessToken: string) =>
  createClient({
    baseUrl: BD2_WEBSHOP_BASE_URL,
    defaultHeaders: {
      accept: 'application/json',
      'content-type': 'application/json',
      authorization: `Bearer ${accessToken}`,
    },
  });

/**
 * 执行每日签到（领取 10 钻石）。
 *
 * @param accessToken - 通过 getSession 获取的 BD2 Web 商店 Bearer token
 * @returns AttendResponse，通过 data.success 判断是否成功，data.errorType=3 表示今日已签到
 */
export const dailyAttend = (accessToken: string): Promise<AttendResponse> =>
  makeClient(accessToken).post<AttendResponse>('/api/attend', { body: { type: 0 } });

/**
 * 执行每周签到（领取 3 抽券）。
 *
 * @param accessToken - 通过 getSession 获取的 BD2 Web 商店 Bearer token
 * @returns AttendResponse，通过 data.success 判断是否成功，data.errorType=3 表示本周已签到
 */
export const weeklyAttend = (accessToken: string): Promise<AttendResponse> =>
  makeClient(accessToken).post<AttendResponse>('/api/attend', { body: { type: 1 } });
