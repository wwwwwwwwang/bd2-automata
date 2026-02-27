import { getDb } from '../db/drizzle';
import { desc, sql } from 'drizzle-orm';
import { redemptionLogs } from '@bd2-automata/shared';
import type { PaginationQuery } from '@bd2-automata/shared';
import { paginate } from '../utils/pagination';

export const findRedemptionLogs = async (d1: D1Database, pagination: PaginationQuery) => {
  const db = getDb(d1);
  const query = db.select().from(redemptionLogs).orderBy(desc(redemptionLogs.createdAt));
  const countSql = sql`SELECT count(*) as count FROM ${redemptionLogs}`;
  return paginate(db, query, countSql, pagination);
};
