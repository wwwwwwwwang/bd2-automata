import { z } from 'zod';

export const createUserSchema = z.object({
  username: z.string().min(1, '用户名不能为空'),
  email: z.string().email(),
  password: z.string().min(8, '密码长度不能少于8位'),
  isActive: z.boolean().optional(),
  maxGameAccounts: z.number().int().positive().optional(),
});

export const updateUserSchema = z.object({
  email: z.string().email().optional(),
  password: z.string().min(8, '密码长度不能少于8位').optional(),
  isActive: z.boolean().optional(),
  maxGameAccounts: z.number().int().positive().optional(),
});
