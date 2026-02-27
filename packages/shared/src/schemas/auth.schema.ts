import { z } from 'zod';

export const loginSchema = z.object({
  username: z.string().min(1, '用户名不能为空'),
  password: z.string().min(1, '密码不能为空'),
});

export const registerSchema = z.object({
  username: z.string().min(1, '用户名不能为空').max(50),
  email: z.string().email('无效的邮箱地址'),
  password: z.string().min(8, '密码长度不能少于8位'),
  inviteCode: z.string().optional(),
});

export const changePasswordSchema = z.object({
  oldPassword: z.string().min(1, '旧密码不能为空'),
  newPassword: z.string().min(8, '新密码长度不能少于8位'),
});
