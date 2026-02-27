import { getDb } from '../db/drizzle';
import { dictionaryItems, createDictionaryItemSchema, updateDictionaryItemSchema, z } from '@bd2-automata/shared';
import { eq, and, sql } from 'drizzle-orm';
import { HTTPException } from 'hono/http-exception';
import { parseId } from '../utils/id';
import type { PaginationQuery } from '@bd2-automata/shared';
import { paginate } from '../utils/pagination';

export const findDictionaryItems = async (d1: D1Database, pagination: PaginationQuery) => {
  const db = getDb(d1);
  const where = eq(dictionaryItems.isDeleted, false);
  const query = db.select().from(dictionaryItems).where(where);
  const countSql = sql`SELECT count(*) as count FROM ${dictionaryItems} WHERE ${where}`;
  return paginate(db, query, countSql, pagination);
};

export const findDictionaryItemById = async (d1: D1Database, id: string) => {
  const db = getDb(d1);
  const item = await db.query.dictionaryItems.findFirst({
    where: and(eq(dictionaryItems.id, parseId(id)), eq(dictionaryItems.isDeleted, false)),
  });
  if (!item) {
    throw new HTTPException(404, { message: '字典项未找到' });
  }
  return item;
};

export const createDictionaryItem = async (d1: D1Database, itemData: z.infer<typeof createDictionaryItemSchema>) => {
  const db = getDb(d1);
  const values = { ...itemData };
  if (values.dictionaryId) {
    values.dictionaryId = parseId(values.dictionaryId, 'dictionaryId');
  }
  try {
    const result = await db.insert(dictionaryItems).values(values).returning();
    return result[0];
  } catch (error: any) {
    if (error.message?.includes('UNIQUE constraint failed')) {
      throw new HTTPException(409, { message: '在同一字典类型下，键（Key）已存在' });
    }
    throw new HTTPException(500, { message: '创建字典项时发生未知错误' });
  }
};

export const updateDictionaryItem = async (d1: D1Database, id: string, itemData: z.infer<typeof updateDictionaryItemSchema>) => {
  const db = getDb(d1);
  const values = { ...itemData, updatedAt: new Date().toISOString() };
  if (values.dictionaryId) {
    values.dictionaryId = parseId(values.dictionaryId, 'dictionaryId');
  }
  const result = await db.update(dictionaryItems).set(values)
    .where(and(eq(dictionaryItems.id, parseId(id)), eq(dictionaryItems.isDeleted, false))).returning();
  if (result.length === 0) {
    throw new HTTPException(404, { message: '字典项未找到，无法更新' });
  }
  return result[0];
};

export const deleteDictionaryItem = async (d1: D1Database, id: string) => {
  const db = getDb(d1);
  const result = await db.update(dictionaryItems)
    .set({ isDeleted: true, deletedAt: new Date().toISOString(), updatedAt: new Date().toISOString() })
    .where(and(eq(dictionaryItems.id, parseId(id)), eq(dictionaryItems.isDeleted, false)))
    .returning();
  if (result.length === 0) {
    throw new HTTPException(404, { message: '字典项未找到，无法删除' });
  }
  return { message: '字典项已成功删除。' };
};
