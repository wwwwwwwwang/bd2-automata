import { getDb } from '../db/drizzle';
import { eventSchedules, createEventSchema, updateEventSchema, z } from '@bd2-automata/shared';
import { eq, and, sql } from 'drizzle-orm';
import { HTTPException } from 'hono/http-exception';
import { parseId } from '../utils/id';
import type { PaginationQuery } from '@bd2-automata/shared';
import { paginate } from '../utils/pagination';

export const findEvents = async (d1: D1Database, pagination: PaginationQuery) => {
  const db = getDb(d1);
  const where = eq(eventSchedules.isDeleted, false);
  const query = db.select().from(eventSchedules).where(where);
  const countSql = sql`SELECT count(*) as count FROM ${eventSchedules} WHERE ${where}`;
  return paginate(db, query, countSql, pagination);
};

export const findEventById = async (d1: D1Database, id: string) => {
  const db = getDb(d1);
  const event = await db.query.eventSchedules.findFirst({
    where: and(eq(eventSchedules.id, parseId(id)), eq(eventSchedules.isDeleted, false)),
  });
  if (!event) {
    throw new HTTPException(404, { message: '活动未找到' });
  }
  return event;
};

export const createEvent = async (d1: D1Database, eventData: z.infer<typeof createEventSchema>) => {
  const db = getDb(d1);
  try {
    const result = await db.insert(eventSchedules).values(eventData).returning();
    return result[0];
  } catch (error: any) {
    if (error.message?.includes('UNIQUE constraint failed')) {
      throw new HTTPException(409, { message: '活动 ID 已存在' });
    }
    throw new HTTPException(500, { message: '创建活动时发生未知错误' });
  }
};

export const updateEvent = async (d1: D1Database, id: string, eventData: z.infer<typeof updateEventSchema>) => {
  const db = getDb(d1);
  const result = await db.update(eventSchedules).set({ ...eventData, updatedAt: new Date().toISOString() })
    .where(and(eq(eventSchedules.id, parseId(id)), eq(eventSchedules.isDeleted, false))).returning();
  if (result.length === 0) {
    throw new HTTPException(404, { message: '活动未找到，无法更新' });
  }
  return result[0];
};

export const deleteEvent = async (d1: D1Database, id: string) => {
  const db = getDb(d1);
  const result = await db.update(eventSchedules)
    .set({ isDeleted: true, deletedAt: new Date().toISOString(), updatedAt: new Date().toISOString() })
    .where(and(eq(eventSchedules.id, parseId(id)), eq(eventSchedules.isDeleted, false)))
    .returning();
  if (result.length === 0) {
    throw new HTTPException(404, { message: '活动未找到，无法删除' });
  }
  return { message: '活动已成功删除。' };
};
