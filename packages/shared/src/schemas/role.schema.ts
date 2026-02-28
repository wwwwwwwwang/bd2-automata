import { z } from 'zod';

// 创建角色的校验 Schema
export const createRoleSchema = z.object({
  name: z.string().min(1, '角色名称不能为空'),
  description: z.string().optional(),
  isActive: z.boolean().optional(),
});

// 更新角色的校验 Schema
export const updateRoleSchema = createRoleSchema.partial();
