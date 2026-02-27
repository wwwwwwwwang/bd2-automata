import { getDb } from '../db/drizzle';
import { emailQueue } from '@bd2-automata/shared';
import type { EmailType } from '@bd2-automata/shared';

interface EnqueueEmailParams {
  userId: number;
  recipientEmail: string;
  subject: string;
  htmlContent: string;
  emailType: EmailType;
  templateId?: number;
  templateVars?: Record<string, unknown>;
}

export const enqueueEmail = async (d1: D1Database, params: EnqueueEmailParams) => {
  const db = getDb(d1);
  await db.insert(emailQueue).values(params);
};
