import { getDb } from '../db/drizzle';
import { giftCodes, createGiftCodeSchema, updateGiftCodeSchema, z } from '@bd2-automata/shared';
import { eq, and, sql } from 'drizzle-orm';
import { HTTPException } from 'hono/http-exception';
import { parseId } from '../utils/id';
import type { PaginationQuery } from '@bd2-automata/shared';
import { paginate } from '../utils/pagination';

export const findGiftCodes = async (d1: D1Database, pagination: PaginationQuery) => {
  const db = getDb(d1);
  const where = eq(giftCodes.isDeleted, false);
  const query = db.select().from(giftCodes).where(where);
  const countSql = sql`SELECT count(*) as count FROM ${giftCodes} WHERE ${where}`;
  return paginate(db, query, countSql, pagination);
};

export const findGiftCodeById = async (d1: D1Database, id: string) => {
  const db = getDb(d1);
  const code = await db.query.giftCodes.findFirst({
    where: and(eq(giftCodes.id, parseId(id)), eq(giftCodes.isDeleted, false)),
  });
  if (!code) {
    throw new HTTPException(404, { message: '礼包码未找到' });
  }
  return code;
};

export const createGiftCode = async (d1: D1Database, codeData: z.infer<typeof createGiftCodeSchema>) => {
  const db = getDb(d1);
  try {
    const result = await db.insert(giftCodes).values(codeData).returning();
    return result[0];
  } catch (error: any) {
    if (error.message?.includes('UNIQUE constraint failed')) {
      throw new HTTPException(409, { message: '礼包码已存在' });
    }
    throw new HTTPException(500, { message: '创建礼包码时发生未知错误' });
  }
};

export const updateGiftCode = async (d1: D1Database, id: string, codeData: z.infer<typeof updateGiftCodeSchema>) => {
  const db = getDb(d1);
  const result = await db.update(giftCodes).set({ ...codeData, updatedAt: new Date().toISOString() })
    .where(and(eq(giftCodes.id, parseId(id)), eq(giftCodes.isDeleted, false))).returning();
  if (result.length === 0) {
    throw new HTTPException(404, { message: '礼包码未找到，无法更新' });
  }
  return result[0];
};

export const deleteGiftCode = async (d1: D1Database, id: string) => {
  const db = getDb(d1);
  const result = await db.update(giftCodes)
    .set({ isDeleted: true, deletedAt: new Date().toISOString(), updatedAt: new Date().toISOString() })
    .where(and(eq(giftCodes.id, parseId(id)), eq(giftCodes.isDeleted, false)))
    .returning();
  if (result.length === 0) {
    throw new HTTPException(404, { message: '礼包码未找到，无法删除' });
  }
  return { message: '礼包码已成功删除。' };
};
