import { getDb } from '../db/drizzle';
import { desc, eq, sql } from 'drizzle-orm';
import { weeklyAttendanceLogs } from '@bd2-automata/shared';
import type { PaginationQuery } from '@bd2-automata/shared';
import { paginate } from '../utils/pagination';

export const findWeeklyAttendanceLogs = async (d1: D1Database, pagination: PaginationQuery) => {
  const db = getDb(d1);
  const query = db.select().from(weeklyAttendanceLogs)
    .where(eq(weeklyAttendanceLogs.isDeleted, false))
    .orderBy(desc(weeklyAttendanceLogs.createdAt));
  const countSql = sql`SELECT count(*) as count FROM ${weeklyAttendanceLogs} WHERE is_deleted = 0`;
  return paginate(db, query, countSql, pagination);
};
