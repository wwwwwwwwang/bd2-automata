import { getDb } from '../db/drizzle';
import { desc, eq, sql } from 'drizzle-orm';
import { emailStats } from '@bd2-automata/shared';
import type { PaginationQuery } from '@bd2-automata/shared';
import { paginate } from '../utils/pagination';

export const findEmailStats = async (d1: D1Database, pagination: PaginationQuery) => {
  const db = getDb(d1);
  const query = db.select().from(emailStats)
    .where(eq(emailStats.isDeleted, false))
    .orderBy(desc(emailStats.statDate));
  const countSql = sql`SELECT count(*) as count FROM ${emailStats} WHERE is_deleted = 0`;
  return paginate(db, query, countSql, pagination);
};
