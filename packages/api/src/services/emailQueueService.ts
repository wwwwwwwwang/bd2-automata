import { getDb } from '../db/drizzle';
import { and, desc, eq, sql } from 'drizzle-orm';
import { emailQueue, emailStats, emailTemplates } from '@bd2-automata/shared';
import { sendEmail } from './resendService';
import type { PaginationQuery } from '@bd2-automata/shared';
import { paginate } from '../utils/pagination';

export const findEmailQueue = async (d1: D1Database, pagination: PaginationQuery) => {
  const db = getDb(d1);
  const query = db.select().from(emailQueue)
    .where(eq(emailQueue.isDeleted, false))
    .orderBy(desc(emailQueue.createdAt));
  const countSql = sql`SELECT count(*) as count FROM ${emailQueue} WHERE is_deleted = 0`;
  return paginate(db, query, countSql, pagination);
};

const renderTemplate = (html: string, vars: Record<string, unknown>): string => {
  return html.replace(/\{\{(\w+)\}\}/g, (_, key) => String(vars[key] ?? ''));
};

export const processEmailQueue = async (d1: D1Database, apiKey: string) => {
  const db = getDb(d1);
  const emailsToSend = await db.query.emailQueue.findMany({
    where: and(eq(emailQueue.status, 'pending'), eq(emailQueue.isDeleted, false)),
    limit: 10,
  });

  let sentCount = 0;
  let failedCount = 0;

  for (const email of emailsToSend) {
    try {
      let finalSubject = email.subject;
      let finalHtml = email.htmlContent;

      if (email.templateId) {
        const template = await db.query.emailTemplates.findFirst({
          where: and(eq(emailTemplates.id, email.templateId), eq(emailTemplates.isDeleted, false)),
        });
        if (template) {
          const vars = (email.templateVars ?? {}) as Record<string, unknown>;
          finalHtml = renderTemplate(template.htmlContent, vars);
          if (template.subject) {
            finalSubject = renderTemplate(template.subject, vars);
          }
        }
      }

      const result = await sendEmail(apiKey, email.recipientEmail, finalSubject, finalHtml);
      await db.update(emailQueue).set({
        status: 'sent',
        resendEmailId: result?.id ?? null,
        sentAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }).where(and(eq(emailQueue.id, email.id), eq(emailQueue.isDeleted, false)));
      sentCount++;
    } catch (error: any) {
      const retryCount = (email.retryCount ?? 0) + 1;
      await db.update(emailQueue).set({
        status: retryCount >= 3 ? 'failed' : 'pending',
        retryCount,
        errorMsg: error.message ?? String(error),
        updatedAt: new Date().toISOString(),
      }).where(and(eq(emailQueue.id, email.id), eq(emailQueue.isDeleted, false)));
      if (retryCount >= 3) failedCount++;
    }
  }

  // 更新当天邮件统计
  if (sentCount > 0 || failedCount > 0) {
    const today = new Date().toISOString().slice(0, 10);
    await db.insert(emailStats).values({
      statDate: today,
      totalSent: sentCount,
      totalFailed: failedCount,
    }).onConflictDoUpdate({
      target: emailStats.statDate,
      set: {
        totalSent: sql`${emailStats.totalSent} + ${sentCount}`,
        totalFailed: sql`${emailStats.totalFailed} + ${failedCount}`,
        updatedAt: new Date().toISOString(),
      },
    });
  }
};
