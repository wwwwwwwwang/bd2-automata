import { getDb } from '../db/drizzle';
import { emailTemplates, createEmailTemplateSchema, updateEmailTemplateSchema, z } from '@bd2-automata/shared';
import { eq, and, sql } from 'drizzle-orm';
import { HTTPException } from 'hono/http-exception';
import { parseId } from '../utils/id';
import type { PaginationQuery } from '@bd2-automata/shared';
import { paginate } from '../utils/pagination';

export const findEmailTemplates = async (d1: D1Database, pagination: PaginationQuery) => {
  const db = getDb(d1);
  const where = eq(emailTemplates.isDeleted, false);
  const query = db.select().from(emailTemplates).where(where);
  const countSql = sql`SELECT count(*) as count FROM ${emailTemplates} WHERE ${where}`;
  return paginate(db, query, countSql, pagination);
};

export const findEmailTemplateById = async (d1: D1Database, id: string) => {
  const db = getDb(d1);
  const template = await db.query.emailTemplates.findFirst({
    where: and(eq(emailTemplates.id, parseId(id)), eq(emailTemplates.isDeleted, false)),
  });
  if (!template) {
    throw new HTTPException(404, { message: '邮件模板未找到' });
  }
  return template;
};

export const createEmailTemplate = async (d1: D1Database, data: z.infer<typeof createEmailTemplateSchema>) => {
  const db = getDb(d1);
  try {
    const result = await db.insert(emailTemplates).values(data).returning();
    return result[0];
  } catch (error: any) {
    if (error.message?.includes('UNIQUE constraint failed')) {
      throw new HTTPException(409, { message: '邮件模板编码已存在' });
    }
    throw new HTTPException(500, { message: '创建邮件模板时发生未知错误' });
  }
};

export const updateEmailTemplate = async (d1: D1Database, id: string, data: z.infer<typeof updateEmailTemplateSchema>) => {
  const db = getDb(d1);
  const result = await db.update(emailTemplates).set({ ...data, updatedAt: new Date().toISOString() })
    .where(and(eq(emailTemplates.id, parseId(id)), eq(emailTemplates.isDeleted, false))).returning();
  if (result.length === 0) {
    throw new HTTPException(404, { message: '邮件模板未找到，无法更新' });
  }
  return result[0];
};

export const deleteEmailTemplate = async (d1: D1Database, id: string) => {
  const db = getDb(d1);
  const result = await db.update(emailTemplates)
    .set({ isDeleted: true, deletedAt: new Date().toISOString(), updatedAt: new Date().toISOString() })
    .where(and(eq(emailTemplates.id, parseId(id)), eq(emailTemplates.isDeleted, false)))
    .returning();
  if (result.length === 0) {
    throw new HTTPException(404, { message: '邮件模板未找到，无法删除' });
  }
  return { message: '邮件模板已成功删除。' };
};
