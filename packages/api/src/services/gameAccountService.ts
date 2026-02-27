import { getDb } from '../db/drizzle';
import { gameAccounts, createGameAccountSchema, updateGameAccountSchema, z } from '@bd2-automata/shared';
import { eq, and, sql } from 'drizzle-orm';
import { HTTPException } from 'hono/http-exception';
import { parseId } from '../utils/id';
import type { PaginationQuery } from '@bd2-automata/shared';
import { paginate } from '../utils/pagination';

export const findGameAccounts = async (d1: D1Database, pagination: PaginationQuery) => {
  const db = getDb(d1);
  const where = eq(gameAccounts.isDeleted, false);
  const query = db.select().from(gameAccounts).where(where);
  const countSql = sql`SELECT count(*) as count FROM ${gameAccounts} WHERE ${where}`;
  return paginate(db, query, countSql, pagination);
};

export const findGameAccountById = async (d1: D1Database, id: string) => {
  const db = getDb(d1);
  const account = await db.query.gameAccounts.findFirst({
    where: and(eq(gameAccounts.id, parseId(id)), eq(gameAccounts.isDeleted, false)),
  });
  if (!account) {
    throw new HTTPException(404, { message: '游戏账号未找到' });
  }
  return account;
};

export const createGameAccount = async (d1: D1Database, accountData: z.infer<typeof createGameAccountSchema>) => {
  const db = getDb(d1);
  const values = { ...accountData };
  if (values.userId) {
    values.userId = parseId(values.userId, 'userId');
  }
  try {
    const result = await db.insert(gameAccounts).values(values).returning();
    return result[0];
  } catch (error: any) {
    if (error.message?.includes('UNIQUE constraint failed')) {
      throw new HTTPException(409, { message: '游戏昵称已存在' });
    }
    throw new HTTPException(500, { message: '创建游戏账号时发生未知错误' });
  }
};

export const updateGameAccount = async (d1: D1Database, id: string, accountData: z.infer<typeof updateGameAccountSchema>) => {
  const db = getDb(d1);
  const values = { ...accountData, updatedAt: new Date().toISOString() };
  if (values.userId) {
    values.userId = parseId(values.userId, 'userId');
  }
  const result = await db.update(gameAccounts).set(values)
    .where(and(eq(gameAccounts.id, parseId(id)), eq(gameAccounts.isDeleted, false))).returning();
  if (result.length === 0) {
    throw new HTTPException(404, { message: '游戏账号未找到，无法更新' });
  }
  return result[0];
};

export const deleteGameAccount = async (d1: D1Database, id: string) => {
  const db = getDb(d1);
  const result = await db.update(gameAccounts)
    .set({ isDeleted: true, deletedAt: new Date().toISOString(), updatedAt: new Date().toISOString() })
    .where(and(eq(gameAccounts.id, parseId(id)), eq(gameAccounts.isDeleted, false)))
    .returning();
  if (result.length === 0) {
    throw new HTTPException(404, { message: '游戏账号未找到，无法删除' });
  }
  return { message: '游戏账号已成功删除。' };
};
