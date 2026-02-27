import { z } from 'zod';
import { PROVIDER_TYPE } from '../enums';

// 创建游戏账号的校验 Schema
export const createGameAccountSchema = z.object({
  userId: z.string(),
  gameNickname: z.string().min(1, '游戏昵称不能为空'),
  refreshToken: z.string().min(1, 'Refresh Token 不能为空'),
  isActive: z.boolean().optional().default(true),
  autoDailyAttend: z.boolean().optional().default(true),
  autoWeeklyAttend: z.boolean().optional().default(true),
  autoRedeem: z.boolean().optional().default(true),
  autoEventAttend: z.boolean().optional().default(true),
  tokenExpiredNotification: z.boolean().optional().default(true),
  providerType: z.enum(PROVIDER_TYPE).optional().default('GOOGLE'),
});

// 更新游戏账号的校验 Schema
export const updateGameAccountSchema = createGameAccountSchema.partial();
