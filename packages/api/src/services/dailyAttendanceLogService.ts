import { getDb } from '../db/drizzle';
import { desc, eq, sql } from 'drizzle-orm';
import { dailyAttendanceLogs } from '@bd2-automata/shared';
import type { PaginationQuery } from '@bd2-automata/shared';
import { paginate } from '../utils/pagination';

export const findDailyAttendanceLogs = async (d1: D1Database, pagination: PaginationQuery) => {
  const db = getDb(d1);
  const query = db.select().from(dailyAttendanceLogs)
    .where(eq(dailyAttendanceLogs.isDeleted, false))
    .orderBy(desc(dailyAttendanceLogs.createdAt));
  const countSql = sql`SELECT count(*) as count FROM ${dailyAttendanceLogs} WHERE is_deleted = 0`;
  return paginate(db, query, countSql, pagination);
};
