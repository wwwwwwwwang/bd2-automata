/**
 * BD2 外部 API 常量
 *
 * 本文件统一管理所有对外 HTTP 请求涉及的 base URL、API Key 和业务常量。
 * 所有外部服务的入口均在此定义，便于统一维护和切换环境。
 */

/**
 * Firebase Web API Key
 * 用于 securetoken（刷新 token）和 identitytoolkit（用户查询）两个 Firebase 服务。
 * 该 Key 为 BD2 Web 商店前端公开使用的 Firebase 项目 Key，非服务端私钥。
 */
export const FIREBASE_API_KEY = 'AIzaSyCrqs43yrhsdBlbdzdq0HrCaSt5V9sNPwU';

/**
 * Neon 平台 App ID
 * Neon 是 BD2 游戏账号体系的中间层鉴权服务（neonapi.com）。
 * app_id=5063 对应 BD2 Web 商店应用。
 */
export const NEON_APP_ID = '5063';

/**
 * BD2 兑换平台 App ID
 * 用于向 AWS Lambda 兑换端点提交兑换码时标识应用。
 */
export const BD2_APP_ID = 'bd2-live';

// ─── Base URLs ───────────────────────────────────────────────────────────────

/** Firebase Secure Token 服务，用于 refresh_token → id_token 换取 */
export const FIREBASE_BASE_URL = 'https://securetoken.googleapis.com';

/** Firebase Identity Toolkit，用于 accounts:lookup 查询用户信息 */
export const FIREBASE_IDENTITY_BASE_URL = 'https://identitytoolkit.googleapis.com';

/** Neon 账号鉴权服务，负责将 Firebase token 转换为游戏平台 Neon token */
export const NEON_BASE_URL = 'https://www.neonapi.com';

/** BD2 Web 商店 API，负责最终登录（获取 accessToken）、签到、活动等操作 */
export const BD2_WEBSHOP_BASE_URL = 'https://bd2-webshop-api.bd2.pmang.cloud';

/** BD2 Pulse 第三方兑换码聚合站，提供当前可用兑换码列表 */
export const BD2_PULSE_BASE_URL = 'https://api.thebd2pulse.com';

/** BD2 官方兑换端点（AWS Lambda），用于实际提交兑换码 */
export const BD2_COUPON_BASE_URL = 'https://loj2urwaua.execute-api.ap-northeast-1.amazonaws.com/prod';

// ─── API Keys ─────────────────────────────────────────────────────────────────

/** BD2 Pulse 聚合站的 API Key，随请求 header x-api-key 发送 */
export const BD2_PULSE_API_KEY = 'pulse-key-abc123-xyz789-very-secret';
