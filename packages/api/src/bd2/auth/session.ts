/**
 * BD2 统一登录会话模块
 *
 * 封装了从 Firebase refresh_token 到最终获取 BD2 Web 商店 accessToken 的完整 4 步流程。
 * 三种账号类型（GOOGLE / APPLE / EMAIL）对外接口完全一致，内部差异仅在于
 * 从 accounts:lookup 响应中提取 provider_sns_srl 的方式不同：
 *
 *   GOOGLE → providerUserInfo[0].rawId（Google 用户数字 ID）
 *   APPLE  → providerUserInfo[0].rawId（Apple sub，不含 "apple.com/" 前缀）
 *   EMAIL  → users[0].email（邮箱地址）
 *
 * 登录流程（4 步）：
 *   Step 1: securetoken /v1/token          refreshToken → idToken
 *   Step 2: identitytoolkit /accounts:lookup  idToken → { localId, provider_sns_srl }
 *   Step 3: neonapi /weblogin/account       → Neon JWT token
 *   Step 4: bd2-webshop /api/login          → BD2 accessToken + userId
 */

import type { ProviderType } from '@bd2-automata/shared';
import { createClient } from '../client';
import {
  FIREBASE_API_KEY,
  FIREBASE_BASE_URL,
  FIREBASE_IDENTITY_BASE_URL,
  NEON_BASE_URL,
  BD2_WEBSHOP_BASE_URL,
  NEON_APP_ID,
} from '../constants';
import type {
  FirebaseTokenResponse,
  FirebaseLookupResponse,
  NeonWebloginResponse,
  Bd2LoginResponse,
  Bd2Session,
} from './types';

// ─── 各外部服务客户端实例（模块级单例，避免重复创建）────────────────────────────

const firebaseClient = createClient({ baseUrl: FIREBASE_BASE_URL });

const identityClient = createClient({ baseUrl: FIREBASE_IDENTITY_BASE_URL });

const neonClient = createClient({
  baseUrl: NEON_BASE_URL,
  defaultHeaders: { 'content-type': 'application/json; charset=UTF-8' },
});

const webshopClient = createClient({
  baseUrl: BD2_WEBSHOP_BASE_URL,
  defaultHeaders: {
    accept: 'application/json',
    'content-type': 'application/json',
  },
});

// ─── Step 1：刷新 Firebase token ──────────────────────────────────────────────

/**
 * 使用 refresh_token 换取新的 Firebase id_token。
 * 所有 providerType 均走此流程（首次登录后获得 refreshToken 存入 DB 即可）。
 */
const refreshFirebaseToken = (refreshToken: string) =>
  firebaseClient.post<FirebaseTokenResponse>(`/v1/token?key=${FIREBASE_API_KEY}`, {
    formBody: `grant_type=refresh_token&refresh_token=${encodeURIComponent(refreshToken)}`,
  });

// ─── Step 2：查询 Firebase 用户信息 ──────────────────────────────────────────

/**
 * 通过 id_token 查询 Firebase 用户详情，获取 localId 和提供商信息。
 */
const lookupFirebaseUser = (idToken: string) =>
  identityClient.post<FirebaseLookupResponse>(
    `/v1/accounts:lookup?key=${FIREBASE_API_KEY}`,
    { body: { idToken } },
  );

/**
 * 根据 providerType 从 lookup 响应中提取 Neon weblogin 所需的 provider_sns_srl：
 *  - GOOGLE/APPLE：取 providerUserInfo[0].rawId（第三方平台的原始用户 ID）
 *  - EMAIL：取 users[0].email（邮箱地址）
 */
const extractProviderSnsSrl = (user: FirebaseLookupResponse['users'][0], providerType: ProviderType): string => {
  if (providerType === 'EMAIL') {
    if (!user.email) throw new Error('Email account missing email field in lookup response');
    return user.email;
  }
  const info = user.providerUserInfo?.[0];
  if (!info?.rawId) throw new Error(`${providerType} account missing providerUserInfo in lookup response`);
  return info.rawId;
};

// ─── Step 3：Neon 账号鉴权 ───────────────────────────────────────────────────

/**
 * 调用 Neon weblogin 接口，将 Firebase 身份信息转换为游戏平台 Neon JWT token。
 * provider_sns 和 provider_sns_srl 因 providerType 不同而有所差异，其余字段固定。
 */
const neonWeblogin = (params: {
  localId: string;
  idToken: string;
  providerType: ProviderType;
  providerSnsSrl: string;
}) =>
  neonClient.post<NeonWebloginResponse>('/api/accounts/v3/weblogin/account', {
    body: {
      provider: 'FIREBASE',
      provider_user_srl: params.localId,       // Firebase localId
      provider_sns: params.providerType,        // "GOOGLE" | "APPLE" | "EMAIL"
      provider_sns_srl: params.providerSnsSrl, // 对应平台的用户标识
      app_id: NEON_APP_ID,
      provider_user_jwt: params.idToken,       // Firebase id_token
      mob_svc_yn: 'N',
      privacy_yn: 'N',
      ad_yn: 'N',
      ad_night_yn: 'N',
      release_ymd: '251118',
    },
  });

// ─── Step 4：BD2 Web 商店登录 ─────────────────────────────────────────────────

/**
 * 使用 Neon token 换取 BD2 Web 商店的 accessToken。
 */
const bd2Login = (neonToken: string) =>
  webshopClient.post<Bd2LoginResponse>('/api/login', {
    body: { token: neonToken, nationCode: '' },
  });

// ─── 对外接口 ─────────────────────────────────────────────────────────────────

/**
 * 获取 BD2 Web 商店会话（完整 4 步登录流程）。
 *
 * @param refreshToken - 存储在 DB 中的 Firebase refresh_token
 * @param providerType - 账号类型：'GOOGLE' | 'APPLE' | 'EMAIL'
 * @returns Bd2Session 包含 accessToken、userId、userIndex、memberId
 * @throws 任意步骤失败时抛出带有描述信息的 Error
 *
 * @example
 * ```ts
 * const session = await getSession(account.refreshToken, account.providerType);
 * await dailyAttend(session.accessToken);
 * ```
 */
export const getSession = async (refreshToken: string, providerType: ProviderType): Promise<Bd2Session> => {
  // Step 1: refresh_token → id_token
  const tokenRes = await refreshFirebaseToken(refreshToken);

  // Step 2: id_token → localId + provider_sns_srl
  const lookupRes = await lookupFirebaseUser(tokenRes.id_token);
  const user = lookupRes.users[0];
  if (!user) throw new Error('Firebase lookup returned no users');
  const providerSnsSrl = extractProviderSnsSrl(user, providerType);

  // Step 3: localId + id_token → Neon token
  const neonRes = await neonWeblogin({
    localId: user.localId,
    idToken: tokenRes.id_token,
    providerType,
    providerSnsSrl,
  });
  if (neonRes.result_code !== '000') {
    throw new Error(`Neon weblogin failed: ${neonRes.result_msg}`);
  }

  // Step 4: Neon token → BD2 accessToken
  const loginRes = await bd2Login(neonRes.value);
  if (loginRes.code !== 'OK') {
    throw new Error(`BD2 login failed: ${loginRes.message}`);
  }

  return {
    accessToken: loginRes.data.accessToken,
    userId: loginRes.data.userId,
    userIndex: loginRes.data.userIndex,
    memberId: loginRes.data.memberId,
  };
};
