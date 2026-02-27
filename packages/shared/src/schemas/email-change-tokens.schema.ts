import { z } from 'zod';

// 请求变更邮箱的校验 Schema
export const requestEmailChangeSchema = z.object({
  newEmail: z.string().email('无效的新邮箱地址'),
});

// 验证邮箱变更的校验 Schema
export const verifyEmailChangeSchema = z.object({
  token: z.string().min(1, '令牌不能为空'),
  oldEmailCode: z.string().length(6, '验证码必须为6位'),
  newEmailCode: z.string().length(6, '验证码必须为6位'),
});
