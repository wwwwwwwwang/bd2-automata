import { z } from 'zod';
import { PERMISSION_TYPE } from '../enums';

// 创建权限的校验 Schema
export const createPermissionSchema = z.object({
  code: z.string().min(1, '权限标识码不能为空'),
  name: z.string().min(1, '权限名称不能为空'),
  type: z.enum(PERMISSION_TYPE).optional().default('button'),
  parentId: z.string().optional(),
  menuPath: z.string().optional(),
  icon: z.string().optional(),
  description: z.string().optional(),
  httpMethod: z.string().optional(),
  apiPath: z.string().optional(),
  sortOrder: z.number().optional().default(0),
});

// 更新权限的校验 Schema
export const updatePermissionSchema = createPermissionSchema.partial();
