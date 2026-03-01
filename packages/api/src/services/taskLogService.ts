import { getDb } from '../db/drizzle';
import { and, desc, eq, sql } from 'drizzle-orm';
import { taskLogs } from '@bd2-automata/shared';
import { HTTPException } from 'hono/http-exception';
import type { PaginationQuery } from '@bd2-automata/shared';
import { paginate } from '../utils/pagination';

export const findLogs = async (d1: D1Database, pagination: PaginationQuery) => {
  const db = getDb(d1);
  const query = db.select().from(taskLogs)
    .where(eq(taskLogs.isDeleted, false))
    .orderBy(desc(taskLogs.executedAt));
  const countSql = sql`SELECT count(*) as count FROM ${taskLogs} WHERE is_deleted = 0`;
  return paginate(db, query, countSql, pagination);
};

export const deleteLog = async (d1: D1Database, id: number) => {
  const db = getDb(d1);
  const result = await db.update(taskLogs)
    .set({ isDeleted: true })
    .where(and(eq(taskLogs.id, id), eq(taskLogs.isDeleted, false)))
    .returning({ id: taskLogs.id });

  if (result.length === 0) {
    throw new HTTPException(404, { message: '日志未找到，无法删除' });
  }
  return { message: '日志已成功删除。' };
};
