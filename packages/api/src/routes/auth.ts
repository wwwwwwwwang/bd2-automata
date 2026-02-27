import { Hono } from 'hono';
import { requestPasswordResetSchema, resetPasswordSchema, loginSchema, registerSchema, changePasswordSchema, requestEmailChangeSchema, verifyEmailChangeSchema, z } from '@bd2-automata/shared';
import type { Env } from '../index';
import {
  requestPasswordReset,
  resetPassword,
  loginUser,
  registerUser,
  logoutUser,
  refreshAccessToken,
  getCurrentUser,
  verifyEmail,
  resendVerification,
  changePassword,
  requestEmailChange,
  verifyEmailChange,
} from '../services/authService';
import { HTTPException } from 'hono/http-exception';
import { authMiddleware } from '../middlewares/auth';
import { rateLimit } from '../middlewares/rate-limit';
import { success } from '../utils/response';
import { validate } from '../utils/validation';

// 速率限制配置
const loginLimit = rateLimit(5, 60);        // 5次/分钟
const registerLimit = rateLimit(3, 300);     // 3次/5分钟
const passwordLimit = rateLimit(3, 300);     // 3次/5分钟
const emailLimit = rateLimit(3, 300);        // 3次/5分钟

const auth = new Hono<{ Bindings: Env }>()
  // 公开接口（无需认证）
  .post('/register', registerLimit, validate('json', registerSchema), async (c) => {
    const data = c.req.valid('json');
    return c.json(success(await registerUser(c.env.DB, data)), 201);
  })
  .post('/login', loginLimit, validate('json', loginSchema), async (c) => {
    const data = c.req.valid('json');
    const secret = c.env.JWT_SECRET;
    if (!secret) {
      throw new HTTPException(500, { message: '服务器内部错误，请联系管理员。' });
    }
    return c.json(success(await loginUser(c.env.DB, secret, data)));
  })
  .post('/refresh', validate('json', z.object({ refreshToken: z.string().min(1) })), async (c) => {
    const { refreshToken } = c.req.valid('json');
    const secret = c.env.JWT_SECRET;
    if (!secret) {
      throw new HTTPException(500, { message: '服务器内部错误，请联系管理员。' });
    }
    return c.json(success(await refreshAccessToken(c.env.DB, secret, refreshToken)));
  })
  .post('/verify-email', validate('json', z.object({ token: z.string().min(1) })), async (c) => {
    const { token } = c.req.valid('json');
    return c.json(success(await verifyEmail(c.env.DB, token)));
  })
  .post('/resend-verification', emailLimit, validate('json', z.object({ email: z.string().email() })), async (c) => {
    const { email } = c.req.valid('json');
    return c.json(success(await resendVerification(c.env.DB, email)));
  })
  .post('/password/request-reset', passwordLimit, validate('json', requestPasswordResetSchema), async (c) => {
    const data = c.req.valid('json');
    return c.json(success(await requestPasswordReset(c.env.DB, data)));
  })
  .post('/password/reset', passwordLimit, validate('json', resetPasswordSchema), async (c) => {
    const data = c.req.valid('json');
    return c.json(success(await resetPassword(c.env.DB, data)));
  })
  // 需要认证的接口
  .use('/me', authMiddleware)
  .get('/me', async (c) => {
    const payload = c.var.user;
    return c.json(success(await getCurrentUser(c.env.DB, payload.id)));
  })
  .use('/logout', authMiddleware)
  .post('/logout', validate('json', z.object({ refreshToken: z.string().min(1) })), async (c) => {
    const { refreshToken } = c.req.valid('json');
    return c.json(success(await logoutUser(c.env.DB, refreshToken)));
  })
  .use('/password/change', authMiddleware)
  .post('/password/change', validate('json', changePasswordSchema), async (c) => {
    const payload = c.var.user;
    const data = c.req.valid('json');
    return c.json(success(await changePassword(c.env.DB, payload.id, data)));
  })
  .use('/email-change/*', authMiddleware)
  .post('/email-change/request', validate('json', requestEmailChangeSchema), async (c) => {
    const payload = c.var.user;
    const data = c.req.valid('json');
    return c.json(success(await requestEmailChange(c.env.DB, payload.id, data)));
  })
  .post('/email-change/verify', validate('json', verifyEmailChangeSchema), async (c) => {
    const data = c.req.valid('json');
    return c.json(success(await verifyEmailChange(c.env.DB, data)));
  });

export default auth;
