import { getDb } from '../db/drizzle';
import { dictionaries, createDictionaryTypeSchema, updateDictionaryTypeSchema, z } from '@bd2-automata/shared';
import { eq, and, sql } from 'drizzle-orm';
import { HTTPException } from 'hono/http-exception';
import { parseId } from '../utils/id';
import type { PaginationQuery } from '@bd2-automata/shared';
import { paginate } from '../utils/pagination';

export const findDictionaryTypes = async (d1: D1Database, pagination: PaginationQuery) => {
  const db = getDb(d1);
  const where = eq(dictionaries.isDeleted, false);
  const query = db.select().from(dictionaries).where(where);
  const countSql = sql`SELECT count(*) as count FROM ${dictionaries} WHERE ${where}`;
  return paginate(db, query, countSql, pagination);
};

export const findDictionaryTypeById = async (d1: D1Database, id: string) => {
  const db = getDb(d1);
  const type = await db.query.dictionaries.findFirst({
    where: and(eq(dictionaries.id, parseId(id)), eq(dictionaries.isDeleted, false)),
  });
  if (!type) {
    throw new HTTPException(404, { message: '字典类型未找到' });
  }
  return type;
};

export const createDictionaryType = async (d1: D1Database, typeData: z.infer<typeof createDictionaryTypeSchema>) => {
  const db = getDb(d1);
  try {
    const result = await db.insert(dictionaries).values(typeData).returning();
    return result[0];
  } catch (error: any) {
    if (error.message?.includes('UNIQUE constraint failed')) {
      throw new HTTPException(409, { message: '字典类型编码已存在' });
    }
    throw new HTTPException(500, { message: '创建字典类型时发生未知错误' });
  }
};

export const updateDictionaryType = async (d1: D1Database, id: string, typeData: z.infer<typeof updateDictionaryTypeSchema>) => {
  const db = getDb(d1);
  const result = await db.update(dictionaries).set({ ...typeData, updatedAt: new Date().toISOString() })
    .where(and(eq(dictionaries.id, parseId(id)), eq(dictionaries.isDeleted, false))).returning();
  if (result.length === 0) {
    throw new HTTPException(404, { message: '字典类型未找到，无法更新' });
  }
  return result[0];
};

export const deleteDictionaryType = async (d1: D1Database, id: string) => {
  const db = getDb(d1);
  const result = await db.update(dictionaries)
    .set({ isDeleted: true, deletedAt: new Date().toISOString(), updatedAt: new Date().toISOString() })
    .where(and(eq(dictionaries.id, parseId(id)), eq(dictionaries.isDeleted, false)))
    .returning();
  if (result.length === 0) {
    throw new HTTPException(404, { message: '字典类型未找到，无法删除' });
  }
  return { message: '字典类型已成功删除。' };
};
