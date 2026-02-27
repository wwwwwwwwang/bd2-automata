import { z } from 'zod';

// 创建活动日程的校验 Schema
export const createEventSchema = z.object({
  eventScheduleId: z.number(),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  isActive: z.boolean().optional().default(true),
  rewardInfo: z.any().optional(),
  popupInfo: z.any().optional(),
});

// 更新活动日程的校验 Schema
export const updateEventSchema = createEventSchema.partial();
