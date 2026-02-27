import { z } from 'zod';

export const createUserSchema = z.object({
  username: z.string().min(1, '用户名不能为空'),
  email: z.string().email(),
  password: z.string().min(8, '密码长度不能少于8位'),
  roleIds: z.array(z.string()).optional(),
});

export const updateUserSchema = z.object({
  email: z.string().email().optional(),
  password: z.string().min(8, '密码长度不能少于8位').optional(),
  maxAccounts: z.number().int().positive().optional(),
  roleIds: z.array(z.string()).optional(),
});
