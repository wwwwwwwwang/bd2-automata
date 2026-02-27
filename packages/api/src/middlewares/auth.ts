
import { createMiddleware } from 'hono/factory';
import { HTTPException } from 'hono/http-exception';
import { verify } from 'hono/jwt';
import { getUserPermissions } from '../services/permissionService';
import type { Env } from '../index';
import { permissions } from '@bd2-automata/shared';

// ===================================================================
// 0. 缓存常量
// ===================================================================
const CACHE_TTL_SECONDS = 60 * 5; // 缓存5分钟

// 通过模块增强，为 Hono 的上下文类型添加 user 属性
declare module 'hono' {
  interface ContextVariableMap {
    user: JwtPayload;
  }
}

// 定义 JWT 载荷的结构
interface JwtPayload {
  id: number;
  username: string;
  // 其他你可能在 token 中存储的字段
}

// ===================================================================
// 1. 认证中间件 (Authentication)
// ===================================================================
export const authMiddleware = createMiddleware<{ Bindings: Env }>(async (c, next) => {
  const authHeader = c.req.header('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new HTTPException(401, { message: '认证失败：缺少或无效的令牌。' });
  }

  const token = authHeader.split(' ')[1];
  try {
    // 从环境变量中获取 JWT 密钥
    const secret = c.env.JWT_SECRET;
    if (!secret) {
      console.error('服务器内部错误：JWT_SECRET 未在环境变量中配置。');
      throw new HTTPException(500, { message: '服务器内部错误，请联系管理员。' });
    }

    const decodedPayload = await verify(token, secret, 'HS256');
    c.set('user', decodedPayload as unknown as JwtPayload);
  } catch (error) {
    throw new HTTPException(401, { message: '认证失败：令牌无效或已过期。' });
  }

  await next();
});

// ===================================================================
// 2. 授权中间件 (Authorization / RBAC)
// ===================================================================
export const rbacMiddleware = createMiddleware<{ Bindings: Env }>(async (c, next) => {
  const user = c.var.user;

  if (!user || !user.id) {
    // 这通常不应该发生，因为 authMiddleware 应该已经处理了
    throw new HTTPException(401, { message: '认证失败：无法识别用户信息。' });
  }

  let userPermissions: (typeof permissions.$inferSelect)[];
  const cacheKey = `permissions:${user.id}`;

  // 从 KV 缓存中获取权限
  const cachedPermissions = await c.env.PERMISSION_CACHE.get(cacheKey, 'json');

  if (cachedPermissions) {
    userPermissions = cachedPermissions as (typeof permissions.$inferSelect)[];
  } else {
    // 如果缓存不存在，则从数据库查询
    userPermissions = await getUserPermissions(c.env.DB, user.id);
    // 并将新权限存入 KV 缓存，设置过期时间
    // 注意：KV 的 put 是一个异步操作，但我们不需要等待它完成，可以“即发即忘”以避免阻塞响应
    c.executionCtx.waitUntil(c.env.PERMISSION_CACHE.put(cacheKey, JSON.stringify(userPermissions), { expirationTtl: CACHE_TTL_SECONDS }));
  }

  const reqMethod = c.req.method;
  const reqPath = new URL(c.req.url).pathname;

  const hasPermission = userPermissions.some(permission => {
    if (permission.httpMethod && permission.apiPath) {
      if (permission.httpMethod !== reqMethod) return false;

      // 逐段比较路径，:param 占位符匹配任意非空段
      const permSegments = permission.apiPath.split('/');
      const reqSegments = reqPath.split('/');
      if (permSegments.length !== reqSegments.length) return false;

      return permSegments.every((seg, i) =>
        seg.startsWith(':') ? reqSegments[i].length > 0 : seg === reqSegments[i],
      );
    }
    return false;
  });

  if (!hasPermission) {
    throw new HTTPException(403, { message: '禁止访问：您没有执行此操作的权限。' });
  }

  await next();
});
