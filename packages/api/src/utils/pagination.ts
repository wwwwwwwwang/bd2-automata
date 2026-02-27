import { SQL } from 'drizzle-orm';
import type { PaginationQuery } from '@bd2-automata/shared';

export interface PaginatedResult<T> {
  items: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

/**
 * 对 drizzle 查询应用分页，返回统一分页响应。
 * @param db - drizzle 实例
 * @param query - 基础 select 查询（未执行），需调用 $dynamic() 使其可链式追加
 * @param countQuery - 用于获取总数的 count SQL
 * @param pagination - { page, limit }
 */
export async function paginate<T>(
  db: { get: (query: SQL) => Promise<{ count: number } | undefined> },
  query: { limit: (n: number) => { offset: (n: number) => Promise<T[]> } },
  countSql: SQL,
  pagination: PaginationQuery,
): Promise<PaginatedResult<T>> {
  const { page, limit } = pagination;
  const offset = (page - 1) * limit;

  const [countResult, items] = await Promise.all([
    db.get(countSql),
    query.limit(limit).offset(offset),
  ]);

  const total = countResult?.count ?? 0;

  return {
    items,
    meta: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
}
