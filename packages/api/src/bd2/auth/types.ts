/**
 * BD2 登录流程相关类型定义
 *
 * 涵盖三个外部服务的请求/响应结构：
 *  1. Firebase Secure Token（刷新 token）
 *  2. Firebase Identity Toolkit（用户查询）
 *  3. Neon 账号鉴权服务（weblogin）
 *  4. BD2 Web 商店登录
 */

// ─── Firebase Secure Token ────────────────────────────────────────────────────

/**
 * POST securetoken.googleapis.com/v1/token 的响应结构
 * 使用 refresh_token 换取新的 id_token（有效期 1 小时）
 */
export interface FirebaseTokenResponse {
  /** Firebase 访问令牌（Bearer token，部分场景使用） */
  access_token: string;
  /** 令牌有效期（秒），固定为 "3600" */
  expires_in: string;
  token_type: string;
  /** 刷新令牌，可能随响应更新，建议持久化存储最新值 */
  refresh_token: string;
  /** Firebase ID Token（JWT），后续所有步骤均使用此值 */
  id_token: string;
  user_id: string;
  project_id: string;
}

// ─── Firebase Identity Toolkit ────────────────────────────────────────────────

/**
 * accounts:lookup 响应中 providerUserInfo 的单条记录
 * Google/Apple 账号会有此字段，Email 账号没有
 */
export interface FirebaseProviderUserInfo {
  /** 提供商 ID，如 "google.com"、"apple.com" */
  providerId: string;
  displayName?: string;
  photoUrl?: string;
  /** 提供商侧的联合 ID（含前缀，如 "apple.com/000080..."） */
  federatedId: string;
  /** 提供商侧的原始用户 ID（不含前缀），作为 Neon weblogin 的 provider_sns_srl */
  rawId: string;
}

/**
 * accounts:lookup 响应中单个用户的数据结构
 */
export interface FirebaseUser {
  /** Firebase 内部用户 ID，作为 Neon weblogin 的 provider_user_srl */
  localId: string;
  displayName?: string;
  /** Email 账号的邮箱地址，作为 Email 类型的 provider_sns_srl */
  email?: string;
  emailVerified?: boolean;
  photoUrl?: string;
  /**
   * 第三方登录提供商信息列表
   * - Google/Apple 账号有此字段，rawId 为对应平台的用户 ID
   * - Email 账号无此字段
   */
  providerUserInfo?: FirebaseProviderUserInfo[];
  validSince?: string;
  lastLoginAt?: string;
  createdAt?: string;
  lastRefreshAt?: string;
}

/**
 * POST identitytoolkit.googleapis.com/v1/accounts:lookup 的响应结构
 */
export interface FirebaseLookupResponse {
  kind: string;
  users: FirebaseUser[];
}

// ─── Neon 账号鉴权服务 ────────────────────────────────────────────────────────

/**
 * POST neonapi.com/api/accounts/v3/weblogin/account 的响应结构
 * result_code="000" 表示成功，value 为 Neon JWT token
 */
export interface NeonWebloginResponse {
  /** Neon JWT token，用于下一步 BD2 webshop 登录 */
  value: string;
  /** 结果码，"000" 表示成功 */
  result_code: string;
  /** 结果描述，如 "API_OK" */
  result_msg: string;
}

// ─── BD2 Web 商店登录 ─────────────────────────────────────────────────────────

/**
 * POST bd2-webshop-api.bd2.pmang.cloud/api/login 响应中 data 字段的结构
 */
export interface Bd2LoginData {
  /** BD2 Web 商店的访问令牌，后续签到、活动等操作需携带此 token */
  accessToken: string;
  memberId: number;
  /** 登录使用的 SNS 类型，如 "GOOGLE"、"APPLE"、"EMAIL" */
  signSns: string;
  /** 注册地区代码，如 "TW"、"HK" */
  regNation: string;
  regNationCnt: number;
  /** 游戏内用户名 */
  userId: string;
  dateOfBirth: number;
  accumulatedPaymentAmount: number;
  /** 游戏内用户数字 ID */
  userIndex: number;
  receiveCouponList: unknown[];
}

/**
 * POST bd2-webshop-api.bd2.pmang.cloud/api/login 的响应结构
 * code="OK" 表示成功，code="FAIL" 表示失败（如 token 无效）
 */
export interface Bd2LoginResponse {
  /** 结果码，"OK" 为成功，"FAIL" 为失败 */
  code: string;
  message: string;
  data: Bd2LoginData;
}

// ─── 对外暴露的会话结果 ────────────────────────────────────────────────────────

/**
 * getSession 函数的返回值，包含后续操作所需的最小必要信息
 */
export interface Bd2Session {
  /** BD2 Web 商店 Bearer token，用于签到、活动、兑换等需鉴权的接口 */
  accessToken: string;
  /** 游戏内用户名（字符串形式） */
  userId: string;
  /** 游戏内用户数字 ID，兑换码提交时使用 */
  userIndex: number;
  memberId: number;
}
