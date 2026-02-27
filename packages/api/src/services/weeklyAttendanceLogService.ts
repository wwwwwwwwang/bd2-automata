import { getDb } from '../db/drizzle';
import { desc, sql } from 'drizzle-orm';
import { weeklyAttendanceLogs } from '@bd2-automata/shared';
import type { PaginationQuery } from '@bd2-automata/shared';
import { paginate } from '../utils/pagination';

export const findWeeklyAttendanceLogs = async (d1: D1Database, pagination: PaginationQuery) => {
  const db = getDb(d1);
  const query = db.select().from(weeklyAttendanceLogs).orderBy(desc(weeklyAttendanceLogs.createdAt));
  const countSql = sql`SELECT count(*) as count FROM ${weeklyAttendanceLogs}`;
  return paginate(db, query, countSql, pagination);
};
