/**
 * BD2 Web 商店限时活动签到模块
 *
 * 提供活动相关的三个接口：
 *  1. getEventInfo      - 获取当前活动基本信息（公开，无需 token）
 *  2. attendEvent       - 提交活动签到领取当日奖励（需 token + eventScheduleId）
 *  3. getUserEventInfo  - 查询当前用户在本活动的签到进度（需 token）
 *
 * 使用流程：
 *  Step 1: getEventInfo() 获取 scheduleInfo.eventScheduleId
 *  Step 2: getUserEventInfo(accessToken) 检查今日是否已签到
 *  Step 3: attendEvent(accessToken, eventScheduleId) 执行签到
 *
 * 活动签到 errorType 说明：
 *  4 = 活动不存在（eventScheduleId 无效）
 *  5 = 今日已签到
 *  6 = 活动奖励已全部领完（超过活动天数）
 */

import { createClient } from '../client';
import { BD2_WEBSHOP_BASE_URL } from '../constants';
import type { EventInfoResponse, EventAttendResponse, EventUserInfoResponse } from './types';

/**
 * 为指定 accessToken 创建带鉴权 header 的 webshop 客户端。
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
 * 无需鉴权的公开客户端，用于获取活动基本信息。
 */
const publicClient = createClient({
  baseUrl: BD2_WEBSHOP_BASE_URL,
  defaultHeaders: { accept: 'application/json' },
});

/**
 * 获取当前活动的基本信息（活动时间、每日奖励配置、eventScheduleId）。
 * 公开接口，无需 Bearer token。
 *
 * @returns EventInfoResponse，从 data.scheduleInfo.eventScheduleId 获取签到所需的 ID
 */
export const getEventInfo = (): Promise<EventInfoResponse> =>
  publicClient.get<EventInfoResponse>('/api/event/event-info');

/**
 * 提交活动当日签到，领取对应天数的奖励。
 *
 * @param accessToken - 通过 getSession 获取的 BD2 Web 商店 Bearer token
 * @param eventScheduleId - 从 getEventInfo 获取的活动日程 ID
 * @returns EventAttendResponse，通过 data.success 判断是否成功
 */
export const attendEvent = (accessToken: string, eventScheduleId: number): Promise<EventAttendResponse> =>
  makeClient(accessToken).post<EventAttendResponse>('/api/event/attend-reward', {
    body: { eventScheduleId },
  });

/**
 * 查询当前用户在本活动周期内的签到进度。
 * 可用于签到前检查是否今日已签到（attendanceCount 与 lastAttendanceDate）。
 *
 * @param accessToken - 通过 getSession 获取的 BD2 Web 商店 Bearer token
 * @returns EventUserInfoResponse，从 data.attendanceCount 获取已签到天数
 */
export const getUserEventInfo = (accessToken: string): Promise<EventUserInfoResponse> =>
  makeClient(accessToken).post<EventUserInfoResponse>('/api/event/event-user-info');
