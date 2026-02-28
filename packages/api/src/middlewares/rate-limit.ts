import { createMiddleware } from 'hono/factory';
import { HTTPException } from 'hono/http-exception';
import type { Env } from '../env';

/**
 * 基于 KV 的滑动窗口速率限制中间件。
 * @param maxRequests - 窗口期内允许的最大请求数
 * @param windowSeconds - 窗口时长（秒）
 */
export const rateLimit = (maxRequests: number = 10, windowSeconds: number = 60) =>
  createMiddleware<{ Bindings: Env }>(async (c, next) => {
    const ip = c.req.header('cf-connecting-ip') || c.req.header('x-forwarded-for') || 'unknown';
    const path = new URL(c.req.url).pathname;
    const key = `rl:${ip}:${path}`;

    const current = await c.env.PERMISSION_CACHE.get(key);
    const count = current ? parseInt(current, 10) : 0;

    if (count >= maxRequests) {
      throw new HTTPException(429, { message: '请求过于频繁，请稍后再试。' });
    }

    c.executionCtx.waitUntil(
      c.env.PERMISSION_CACHE.put(key, String(count + 1), { expirationTtl: windowSeconds }),
    );

    await next();
  });
