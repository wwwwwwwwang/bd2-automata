import { z } from 'zod';

// 创建字典项的校验 Schema
export const createDictionaryItemSchema = z.object({
  dictionaryId: z.string(),
  key: z.string().min(1, '键不能为空'),
  value: z.string().min(1, '值不能为空'),
  label: z.string().optional(),
  sortOrder: z.number().optional().default(0),
  isActive: z.boolean().optional().default(true),
  isDefault: z.boolean().optional().default(false),
});

// 更新字典项的校验 Schema
export const updateDictionaryItemSchema = createDictionaryItemSchema.partial();
