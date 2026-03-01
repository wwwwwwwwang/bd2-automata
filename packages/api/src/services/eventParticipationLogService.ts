import { getDb } from '../db/drizzle';
import { desc, eq, sql } from 'drizzle-orm';
import { eventParticipationLogs } from '@bd2-automata/shared';
import type { PaginationQuery } from '@bd2-automata/shared';
import { paginate } from '../utils/pagination';

export const findEventParticipationLogs = async (d1: D1Database, pagination: PaginationQuery) => {
  const db = getDb(d1);
  const query = db.select().from(eventParticipationLogs)
    .where(eq(eventParticipationLogs.isDeleted, false))
    .orderBy(desc(eventParticipationLogs.createdAt));
  const countSql = sql`SELECT count(*) as count FROM ${eventParticipationLogs} WHERE is_deleted = 0`;
  return paginate(db, query, countSql, pagination);
};
