import { drizzle } from 'drizzle-orm/d1';
import { schema } from '@bd2-automata/shared';

/**
 * 创建并返回一个 Drizzle ORM 实例。
 * 这个函数封装了 Drizzle 与 Cloudflare D1 数据库的连接过程。
 * @param d1 - 从 Hono 上下文中获取的 D1 数据库绑定。
 * @returns 配置好 Schema 的 Drizzle 实例，可以直接用于数据库查询。
 */
export const getDb = (d1: D1Database) => drizzle(d1, { schema });
