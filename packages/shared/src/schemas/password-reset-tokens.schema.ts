import { z } from 'zod';

// 请求密码重置的校验 Schema
export const requestPasswordResetSchema = z.object({
  email: z.string().email('无效的邮箱地址'),
});

// 执行密码重置的校验 Schema
export const resetPasswordSchema = z.object({
  token: z.string().min(1, '令牌不能为空'),
  newPassword: z.string().min(6, '新密码长度不能少于6位'),
});
