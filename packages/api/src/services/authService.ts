import { getDb } from '../db/drizzle';
import { eq, and } from 'drizzle-orm';
import { users, refreshTokens, passwordResetTokens, emailChangeTokens, requestPasswordResetSchema, resetPasswordSchema, requestEmailChangeSchema, verifyEmailChangeSchema, z, Argon2id, generateId, loginSchema, registerSchema, changePasswordSchema } from '@bd2-automata/shared';
import { sign, verify } from 'hono/jwt';
import { HTTPException } from 'hono/http-exception';
import { parseId } from '../utils/id';
import { enqueueEmail } from '../utils/email';

/**
 * 用户注册
 */
export const registerUser = async (d1: D1Database, data: z.infer<typeof registerSchema>) => {
  const db = getDb(d1);

  // 检查用户名是否已存在
  const existingUser = await db.select().from(users).where(eq(users.username, data.username));
  if (existingUser.length > 0) {
    throw new HTTPException(409, { message: '用户名已存在' });
  }

  // 检查邮箱是否已存在
  if (data.email) {
    const existingEmail = await db.select().from(users).where(eq(users.email, data.email));
    if (existingEmail.length > 0) {
      throw new HTTPException(409, { message: '邮箱地址已被注册' });
    }
  }

  const hashedPassword = await new Argon2id().hash(data.password);
  const verifyToken = generateId(40);
  const verifyTokenExpires = Date.now() + 1000 * 60 * 60 * 24; // 24小时

  const [newUser] = await db.insert(users).values({
    username: data.username,
    email: data.email,
    passwordHash: hashedPassword,
    emailVerifyToken: verifyToken,
    emailVerifyTokenExpires: verifyTokenExpires,
  }).returning();

  if (data.email) {
    await enqueueEmail(d1, {
      userId: newUser.id,
      recipientEmail: data.email,
      subject: '请验证您的邮箱地址',
      htmlContent: `<p>您的邮箱验证令牌：<strong>${verifyToken}</strong></p><p>有效期24小时。</p>`,
      emailType: 'system_notify',
    });
  }

  return {
    message: '注册成功，请查收验证邮件。',
    userId: String(newUser.id),
  };
};

/**
 * 用户登录 — 返回 accessToken + refreshToken
 */
export const loginUser = async (d1: D1Database, jwtSecret: string, data: z.infer<typeof loginSchema>) => {
  const db = getDb(d1);
  const [user] = await db.select().from(users).where(eq(users.username, data.username));

  if (!user) {
    throw new HTTPException(401, { message: '用户名或密码错误' });
  }

  if (user.isDeleted) {
    throw new HTTPException(401, { message: '用户名或密码错误' });
  }

  const isPasswordValid = await new Argon2id().verify(user.passwordHash, data.password);
  if (!isPasswordValid) {
    throw new HTTPException(401, { message: '用户名或密码错误' });
  }

  // 更新最后登录时间
  await db.update(users).set({ lastLoginAt: new Date().toISOString() }).where(eq(users.id, user.id));

  // 生成 accessToken
  const accessPayload = {
    id: user.id,
    username: user.username,
    exp: Math.floor(Date.now() / 1000) + 60 * 60, // 1小时
  };
  const accessToken = await sign(accessPayload, jwtSecret, 'HS256');

  // 生成 refreshToken 并存入数据库
  const refreshTokenValue = generateId(64);
  const refreshExpiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7); // 7天

  await db.insert(refreshTokens).values({
    userId: user.id,
    token: refreshTokenValue,
    expiresAt: refreshExpiresAt.toISOString(),
  });

  return {
    accessToken,
    refreshToken: refreshTokenValue,
  };
};

/**
 * 登出 — 删除 refresh token
 */
export const logoutUser = async (d1: D1Database, refreshToken: string) => {
  const db = getDb(d1);
  await db.delete(refreshTokens).where(eq(refreshTokens.token, refreshToken));
  return { message: '已成功登出。' };
};

/**
 * 刷新 Token — 用 refreshToken 换新 accessToken
 */
export const refreshAccessToken = async (d1: D1Database, jwtSecret: string, token: string) => {
  const db = getDb(d1);
  const [tokenRecord] = await db.select().from(refreshTokens).where(eq(refreshTokens.token, token));

  if (!tokenRecord) {
    throw new HTTPException(401, { message: '无效的刷新令牌' });
  }

  if (new Date(tokenRecord.expiresAt) < new Date()) {
    await db.delete(refreshTokens).where(eq(refreshTokens.id, tokenRecord.id));
    throw new HTTPException(401, { message: '刷新令牌已过期，请重新登录' });
  }

  // 查询用户
  const [user] = await db.select().from(users).where(eq(users.id, tokenRecord.userId));
  if (!user || user.isDeleted) {
    throw new HTTPException(401, { message: '用户不存在或已被禁用' });
  }

  // 签发新 accessToken
  const accessPayload = {
    id: user.id,
    username: user.username,
    exp: Math.floor(Date.now() / 1000) + 60 * 60,
  };
  const accessToken = await sign(accessPayload, jwtSecret, 'HS256');

  // 轮换 refreshToken（事务保证原子性）
  const newRefreshToken = generateId(64);
  const newExpiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7);
  await db.transaction(async (tx) => {
    await tx.delete(refreshTokens).where(eq(refreshTokens.id, tokenRecord.id));
    await tx.insert(refreshTokens).values({
      userId: user.id,
      token: newRefreshToken,
      expiresAt: newExpiresAt.toISOString(),
    });
  });

  return {
    accessToken,
    refreshToken: newRefreshToken,
  };
};

/**
 * 获取当前用户信息
 */
export const getCurrentUser = async (d1: D1Database, userId: number) => {
  const db = getDb(d1);
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
  });

  if (!user || user.isDeleted) {
    throw new HTTPException(404, { message: '用户不存在' });
  }

  // 排除敏感字段
  const { passwordHash, emailVerifyToken, emailVerifyTokenExpires, ...safeUser } = user;
  return safeUser;
};

/**
 * 邮箱验证
 */
export const verifyEmail = async (d1: D1Database, token: string) => {
  const db = getDb(d1);
  const [user] = await db.select().from(users).where(eq(users.emailVerifyToken, token));

  if (!user) {
    throw new HTTPException(400, { message: '无效的验证令牌' });
  }

  if (user.emailVerifyTokenExpires && user.emailVerifyTokenExpires < Date.now()) {
    throw new HTTPException(400, { message: '验证令牌已过期，请重新发送验证邮件' });
  }

  await db.update(users).set({
    emailVerified: true,
    emailVerifyToken: null,
    emailVerifyTokenExpires: null,
    updatedAt: new Date().toISOString(),
  }).where(eq(users.id, user.id));

  return { message: '邮箱验证成功。' };
};

/**
 * 重发验证邮件
 */
export const resendVerification = async (d1: D1Database, email: string) => {
  const db = getDb(d1);
  const [user] = await db.select().from(users).where(eq(users.email, email));

  if (!user) {
    // 安全考虑，不暴露用户是否存在
    return { message: '如果该邮箱地址存在，验证邮件已重新发送。' };
  }

  if (user.emailVerified) {
    return { message: '该邮箱已验证，无需重复验证。' };
  }

  const verifyToken = generateId(40);
  const verifyTokenExpires = Date.now() + 1000 * 60 * 60 * 24;

  await db.update(users).set({
    emailVerifyToken: verifyToken,
    emailVerifyTokenExpires: verifyTokenExpires,
    updatedAt: new Date().toISOString(),
  }).where(eq(users.id, user.id));

  await enqueueEmail(d1, {
    userId: user.id,
    recipientEmail: email,
    subject: '请验证您的邮箱地址',
    htmlContent: `<p>您的邮箱验证令牌：<strong>${verifyToken}</strong></p><p>有效期24小时。</p>`,
    emailType: 'system_notify',
  });

  return { message: '如果该邮箱地址存在，验证邮件已重新发送。' };
};

/**
 * 请求密码重置
 */
export const requestPasswordReset = async (d1: D1Database, data: z.infer<typeof requestPasswordResetSchema>) => {
  const db = getDb(d1);
  const [user] = await db.select().from(users).where(eq(users.email, data.email));

  if (!user) {
    return { message: '如果该邮箱地址存在，一封密码重置邮件已经发送至您的邮箱。' };
  }

  await db.delete(passwordResetTokens).where(eq(passwordResetTokens.userId, user.id));

  const token = generateId(40);
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60);

  await db.insert(passwordResetTokens).values({
    userId: user.id,
    token,
    expiresAt: expiresAt.toISOString(),
  });

  await enqueueEmail(d1, {
    userId: user.id,
    recipientEmail: data.email,
    subject: '密码重置请求',
    htmlContent: `<p>您的密码重置令牌：<strong>${token}</strong></p><p>有效期1小时。</p>`,
    emailType: 'password_reset',
  });

  return { message: '如果该邮箱地址存在，一封密码重置邮件已经发送至您的邮箱。' };
};

/**
 * 执行密码重置
 */
export const resetPassword = async (d1: D1Database, data: z.infer<typeof resetPasswordSchema>) => {
  const db = getDb(d1);
  const [tokenRecord] = await db.select().from(passwordResetTokens).where(eq(passwordResetTokens.token, data.token));

  if (!tokenRecord) {
    throw new HTTPException(400, { message: '无效或已过期的密码重置令牌。' });
  }

  if (new Date(tokenRecord.expiresAt) < new Date()) {
    await db.delete(passwordResetTokens).where(eq(passwordResetTokens.id, tokenRecord.id));
    throw new HTTPException(400, { message: '无效或已过期的密码重置令牌。' });
  }

  await db.delete(passwordResetTokens).where(eq(passwordResetTokens.id, tokenRecord.id));

  const hashedPassword = await new Argon2id().hash(data.newPassword);
  await db.update(users).set({ passwordHash: hashedPassword }).where(eq(users.id, tokenRecord.userId));

  return { message: '密码已成功重置。' };
};

/**
 * 修改密码（已登录用户）
 */
export const changePassword = async (d1: D1Database, userId: number, data: z.infer<typeof changePasswordSchema>) => {
  const db = getDb(d1);
  const [user] = await db.select().from(users).where(and(eq(users.id, userId), eq(users.isDeleted, false)));

  if (!user) {
    throw new HTTPException(404, { message: '用户未找到' });
  }

  const isOldPasswordValid = await new Argon2id().verify(user.passwordHash, data.oldPassword);
  if (!isOldPasswordValid) {
    throw new HTTPException(400, { message: '旧密码不正确' });
  }

  const hashedPassword = await new Argon2id().hash(data.newPassword);
  await db.update(users).set({
    passwordHash: hashedPassword,
    updatedAt: new Date().toISOString(),
  }).where(eq(users.id, userId));

  return { message: '密码修改成功。' };
};

/**
 * 请求变更邮箱 — 生成令牌和验证码
 */
export const requestEmailChange = async (d1: D1Database, userId: number, data: z.infer<typeof requestEmailChangeSchema>) => {
  const db = getDb(d1);
  const [user] = await db.select().from(users).where(and(eq(users.id, userId), eq(users.isDeleted, false)));

  if (!user) {
    throw new HTTPException(404, { message: '用户未找到' });
  }

  if (!user.email) {
    throw new HTTPException(400, { message: '当前账号未绑定邮箱，无法变更' });
  }

  // 检查新邮箱是否已被使用
  const [existingEmail] = await db.select().from(users).where(eq(users.email, data.newEmail));
  if (existingEmail) {
    throw new HTTPException(409, { message: '该邮箱地址已被其他账号使用' });
  }

  // 清除该用户之前的变更令牌
  await db.delete(emailChangeTokens).where(eq(emailChangeTokens.userId, userId));

  const token = generateId(40);
  const oldCode = String(Math.floor(100000 + Math.random() * 900000));
  const newCode = String(Math.floor(100000 + Math.random() * 900000));
  const expiresAt = new Date(Date.now() + 1000 * 60 * 30); // 30分钟

  await db.insert(emailChangeTokens).values({
    userId,
    oldEmail: user.email,
    newEmail: data.newEmail,
    token,
    oldCode,
    newCode,
    expiresAt: expiresAt.toISOString(),
  });

  // 发送验证码到旧邮箱
  await enqueueEmail(d1, {
    userId,
    recipientEmail: user.email,
    subject: '邮箱变更验证码（旧邮箱）',
    htmlContent: `<p>您正在变更邮箱地址，旧邮箱验证码：<strong>${oldCode}</strong></p><p>有效期30分钟。</p>`,
    emailType: 'system_notify',
  });

  // 发送验证码到新邮箱
  await enqueueEmail(d1, {
    userId,
    recipientEmail: data.newEmail,
    subject: '邮箱变更验证码（新邮箱）',
    htmlContent: `<p>您正在变更邮箱地址，新邮箱验证码：<strong>${newCode}</strong></p><p>有效期30分钟。</p>`,
    emailType: 'system_notify',
  });

  return { message: '验证码已发送至旧邮箱和新邮箱，请在30分钟内完成验证。', token };
};

/**
 * 验证邮箱变更 — 双邮箱验证码确认
 */
export const verifyEmailChange = async (d1: D1Database, data: z.infer<typeof verifyEmailChangeSchema>) => {
  const db = getDb(d1);
  const [tokenRecord] = await db.select().from(emailChangeTokens).where(eq(emailChangeTokens.token, data.token));

  if (!tokenRecord) {
    throw new HTTPException(400, { message: '无效或已过期的邮箱变更令牌。' });
  }

  if (new Date(tokenRecord.expiresAt) < new Date()) {
    await db.delete(emailChangeTokens).where(eq(emailChangeTokens.id, tokenRecord.id));
    throw new HTTPException(400, { message: '无效或已过期的邮箱变更令牌。' });
  }

  // 验证旧邮箱验证码
  if (tokenRecord.oldCode !== data.oldEmailCode) {
    const newAttempts = (tokenRecord.oldAttempts ?? 0) + 1;
    if (newAttempts >= 5) {
      await db.delete(emailChangeTokens).where(eq(emailChangeTokens.id, tokenRecord.id));
      throw new HTTPException(400, { message: '验证码错误次数过多，请重新发起邮箱变更。' });
    }
    await db.update(emailChangeTokens).set({ oldAttempts: newAttempts }).where(eq(emailChangeTokens.id, tokenRecord.id));
    throw new HTTPException(400, { message: '旧邮箱验证码不正确' });
  }

  // 验证新邮箱验证码
  if (tokenRecord.newCode !== data.newEmailCode) {
    const newAttempts = (tokenRecord.newAttempts ?? 0) + 1;
    if (newAttempts >= 5) {
      await db.delete(emailChangeTokens).where(eq(emailChangeTokens.id, tokenRecord.id));
      throw new HTTPException(400, { message: '验证码错误次数过多，请重新发起邮箱变更。' });
    }
    await db.update(emailChangeTokens).set({ newAttempts: newAttempts }).where(eq(emailChangeTokens.id, tokenRecord.id));
    throw new HTTPException(400, { message: '新邮箱验证码不正确' });
  }

  // 双验证通过，更新邮箱
  await db.update(users).set({
    email: tokenRecord.newEmail,
    updatedAt: new Date().toISOString(),
  }).where(eq(users.id, tokenRecord.userId));

  // 清除令牌
  await db.delete(emailChangeTokens).where(eq(emailChangeTokens.id, tokenRecord.id));

  return { message: '邮箱变更成功。' };
};
