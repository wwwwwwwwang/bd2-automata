import { getDb } from '../db/drizzle';
import { desc, eq, sql } from 'drizzle-orm';
import { redemptionLogs } from '@bd2-automata/shared';
import type { PaginationQuery } from '@bd2-automata/shared';
import { paginate } from '../utils/pagination';

export const findRedemptionLogs = async (d1: D1Database, pagination: PaginationQuery) => {
  const db = getDb(d1);
  const query = db.select().from(redemptionLogs)
    .where(eq(redemptionLogs.isDeleted, false))
    .orderBy(desc(redemptionLogs.createdAt));
  const countSql = sql`SELECT count(*) as count FROM ${redemptionLogs} WHERE is_deleted = 0`;
  return paginate(db, query, countSql, pagination);
};
