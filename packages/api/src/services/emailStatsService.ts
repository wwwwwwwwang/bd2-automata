import { getDb } from '../db/drizzle';
import { desc, sql } from 'drizzle-orm';
import { emailStats } from '@bd2-automata/shared';
import type { PaginationQuery } from '@bd2-automata/shared';
import { paginate } from '../utils/pagination';

export const findEmailStats = async (d1: D1Database, pagination: PaginationQuery) => {
  const db = getDb(d1);
  const query = db.select().from(emailStats).orderBy(desc(emailStats.statDate));
  const countSql = sql`SELECT count(*) as count FROM ${emailStats}`;
  return paginate(db, query, countSql, pagination);
};
