import { getDb } from '../db/drizzle';
import { eq, sql } from 'drizzle-orm';
import { tasks, createTaskSchema, updateTaskSchema, z } from '@bd2-automata/shared';
import type { PaginationQuery } from '@bd2-automata/shared';
import { paginate } from '../utils/pagination';
import { HTTPException } from 'hono/http-exception';

export const findTasks = async (d1: D1Database, pagination: PaginationQuery) => {
  const db = getDb(d1);
  const query = db.select().from(tasks);
  const countSql = sql`SELECT count(*) as count FROM ${tasks}`;
  return paginate(db, query, countSql, pagination);
};

export const findTaskById = async (d1: D1Database, id: number) => {
  const db = getDb(d1);
  const task = await db.query.tasks.findFirst({
    where: eq(tasks.id, id),
  });
  if (!task) {
    throw new HTTPException(404, { message: '任务未找到' });
  }
  return task;
};

export const createTask = async (d1: D1Database, data: z.infer<typeof createTaskSchema>) => {
  const db = getDb(d1);
  const [newTask] = await db.insert(tasks).values(data).returning();
  return newTask;
};

export const updateTask = async (d1: D1Database, id: number, data: z.infer<typeof updateTaskSchema>) => {
  const db = getDb(d1);
  const [updatedTask] = await db.update(tasks).set(data).where(eq(tasks.id, id)).returning();
  if (!updatedTask) {
    throw new HTTPException(404, { message: '任务未找到，无法更新' });
  }
  return updatedTask;
};

export const deleteTask = async (d1: D1Database, id: number) => {
  const db = getDb(d1);
  await db.delete(tasks).where(eq(tasks.id, id));
  return { message: '任务已成功删除。' };
};
