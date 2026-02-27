import { z } from 'zod';

// 创建字典类型的校验 Schema
export const createDictionaryTypeSchema = z.object({
  code: z.string().min(1, '编码不能为空'),
  name: z.string().min(1, '名称不能为空'),
  description: z.string().optional(),
  isSystem: z.boolean().optional().default(false),
  sortOrder: z.number().optional().default(0),
});

// 更新字典类型的校验 Schema
export const updateDictionaryTypeSchema = createDictionaryTypeSchema.partial();
