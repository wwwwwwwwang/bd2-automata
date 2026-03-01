/**
 * BD2 兑换码相关类型定义
 *
 * 涉及两个独立外部服务：
 *  1. BD2 Pulse（api.thebd2pulse.com）- 第三方聚合站，提供当前所有已知兑换码列表
 *  2. BD2 官方兑换端点（AWS Lambda）  - 实际提交兑换码，需要游戏 userId
 */

// ─── BD2 Pulse 兑换码列表 ─────────────────────────────────────────────────────

/**
 * 兑换码多语言奖励描述
 */
export interface PulseCodeReward {
  'zh-Hant-TW': string;
  'zh-Hans-CN': string;
  'en': string;
  'ja-JP': string;
  'ko-KR': string;
}

/**
 * 兑换码状态：
 *  - active   : 当前有效（无过期时间限制）
 *  - limited  : 有时限，需在 expiry_date 前使用
 *  - expired  : 已过期，无法再使用
 *  - permanent: 永久有效
 */
export type PulseCodeStatus = 'active' | 'limited' | 'expired' | 'permanent';

/**
 * BD2 Pulse 聚合站返回的单条兑换码信息
 */
export interface PulseCode {
  /** 兑换码字符串，提交兑换时使用 */
  code: string;
  /** 兑换码对应的多语言奖励描述 */
  reward: PulseCodeReward;
  /** 兑换码当前状态 */
  status: PulseCodeStatus;
  /** 过期日期，格式 "YYYY/MM/DD"，permanent/active 类型可能为 null */
  expiry_date: string | null;
  /** 宣传图片 URL，可能为 null */
  image_url: string | null;
}

// ─── BD2 官方兑换端点 ─────────────────────────────────────────────────────────

/**
 * POST /prod/coupon 的响应结构
 * 兑换成功时响应为空对象或仅含 requestId
 * 兑换失败时包含 errorCode 等错误信息
 *
 * 常见 errorCode：
 *  - AlreadyUsed    : 该账号已使用过此兑换码
 *  - InvalidCode    : 兑换码不存在或已失效
 *  - ExpiredCode    : 兑换码已过期
 */
export interface CouponRedeemResponse {
  requestId?: string;
  /** 错误类型名称（成功时不存在） */
  name?: string;
  /** 错误码（成功时不存在） */
  errorCode?: string;
  error?: string;
  message?: string;
  statusCode?: number;
}
