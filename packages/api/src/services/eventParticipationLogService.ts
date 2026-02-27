import { getDb } from '../db/drizzle';
import { desc, sql } from 'drizzle-orm';
import { eventParticipationLogs } from '@bd2-automata/shared';
import type { PaginationQuery } from '@bd2-automata/shared';
import { paginate } from '../utils/pagination';

export const findEventParticipationLogs = async (d1: D1Database, pagination: PaginationQuery) => {
  const db = getDb(d1);
  const query = db.select().from(eventParticipationLogs).orderBy(desc(eventParticipationLogs.createdAt));
  const countSql = sql`SELECT count(*) as count FROM ${eventParticipationLogs}`;
  return paginate(db, query, countSql, pagination);
};
