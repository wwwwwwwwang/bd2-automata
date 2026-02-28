import { getDb } from '../db/drizzle';
import { desc, eq, sql } from 'drizzle-orm';
import { logs } from '@bd2-automata/shared';
import { HTTPException } from 'hono/http-exception';
import type { PaginationQuery } from '@bd2-automata/shared';
import { paginate } from '../utils/pagination';

export const findLogs = async (d1: D1Database, pagination: PaginationQuery) => {
  const db = getDb(d1);
  const query = db.select().from(logs).orderBy(desc(logs.executedAt));
  const countSql = sql`SELECT count(*) as count FROM ${logs}`;
  return paginate(db, query, countSql, pagination);
};

export const deleteLog = async (d1: D1Database, id: number) => {
  const db = getDb(d1);
  const result = await db.delete(logs).where(eq(logs.id, id)).returning();
  if (result.length === 0) {
    throw new HTTPException(404, { message: '日志未找到，无法删除' });
  }
  return { message: '日志已成功删除。' };
};
