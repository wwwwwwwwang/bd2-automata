import { and, eq, sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/d1';
import { emailQueue, emailStats, emailTemplates, schema } from '@bd2-automata/shared';
import type { Env } from '../env';
import { Resend } from 'resend';

const renderTemplate = (html: string, vars: Record<string, unknown>): string => {
  return html.replace(/\{\{(\w+)\}\}/g, (_, key) => String(vars[key] ?? ''));
};

const sendEmail = async (
  apiKey: string,
  to: string,
  subject: string,
  html: string,
  from: string = 'noreply@bd2-automata.com',
) => {
  const resend = new Resend(apiKey);
  const { data, error } = await resend.emails.send({
    from,
    to,
    subject,
    html,
  });

  if (error) {
    throw error;
  }

  return data;
};

export type EmailProcessResult = {
  status: 'ok';
  taskType: 'EMAIL_PROCESS';
  processed: number;
  sent: number;
  failed: number;
};

export const processEmailQueue = async (env: Env): Promise<EmailProcessResult> => {
  const db = drizzle(env.DB, { schema });

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
          finalSubject = renderTemplate(template.subject, vars);
        }
      }

      const result = await sendEmail(env.RESEND_API_KEY, email.recipientEmail, finalSubject, finalHtml);

      await db
        .update(emailQueue)
        .set({
          status: 'sent',
          resendEmailId: result?.id ?? null,
          sentAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })
        .where(eq(emailQueue.id, email.id));

      sentCount++;
    } catch (error: any) {
      const retryCount = (email.retryCount ?? 0) + 1;

      await db
        .update(emailQueue)
        .set({
          status: retryCount >= 3 ? 'failed' : 'pending',
          retryCount,
          errorMsg: error?.message ?? String(error),
          updatedAt: new Date().toISOString(),
        })
        .where(eq(emailQueue.id, email.id));

      if (retryCount >= 3) {
        failedCount++;
      }
    }
  }

  if (sentCount > 0 || failedCount > 0) {
    const today = new Date().toISOString().slice(0, 10);
    await db
      .insert(emailStats)
      .values({
        statDate: today,
        totalSent: sentCount,
        totalFailed: failedCount,
      })
      .onConflictDoUpdate({
        target: emailStats.statDate,
        set: {
          totalSent: sql`${emailStats.totalSent} + ${sentCount}`,
          totalFailed: sql`${emailStats.totalFailed} + ${failedCount}`,
          updatedAt: new Date().toISOString(),
        },
      });
  }

  return {
    status: 'ok',
    taskType: 'EMAIL_PROCESS',
    processed: emailsToSend.length,
    sent: sentCount,
    failed: failedCount,
  };
};
