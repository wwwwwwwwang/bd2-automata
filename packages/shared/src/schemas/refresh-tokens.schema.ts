import { z } from 'zod';

// 创建刷新令牌的校验 Schema (通常由系统内部使用)
export const createRefreshTokenSchema = z.object({
  userId: z.string(),
  token: z.string(),
  expiresAt: z.string(),
});
