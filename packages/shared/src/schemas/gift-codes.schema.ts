import { z } from 'zod';

// 创建礼包码的校验 Schema
export const createGiftCodeSchema = z.object({
  code: z.string().min(1, '礼包码不能为空'),
  rewardDesc: z.string().optional(),
  isActive: z.boolean().optional().default(true),
  expiredAt: z.string().datetime().optional(),
});

// 更新礼包码的校验 Schema
export const updateGiftCodeSchema = createGiftCodeSchema.partial();
