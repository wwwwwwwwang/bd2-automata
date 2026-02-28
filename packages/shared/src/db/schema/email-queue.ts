import { sql } from 'drizzle-orm';
import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';
import { users } from './users';
import { emailTemplates } from './email-templates';
import { EMAIL_TYPE, EMAIL_QUEUE_STATUS } from '../../enums';

// 邮件发送队列
export const emailQueue = sqliteTable('automata_email_queue', {
  id: integer('id', { mode: 'number' }).primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  recipientEmail: text('recipient_email').notNull(),
  subject: text('subject').notNull(),
  htmlContent: text('html_content').notNull(),
  emailType: text('email_type', { enum: EMAIL_TYPE }).notNull(),
  templateId: integer('template_id').references(() => emailTemplates.id, { onDelete: 'set null' }),
  templateVars: text('template_vars', { mode: 'json' }),
  resendEmailId: text('resend_email_id'),
  status: text('status', { enum: EMAIL_QUEUE_STATUS }).default('pending'),
  retryCount: integer('retry_count').default(0),
  errorMsg: text('error_msg'),
  executionHistory: text('execution_history', { mode: 'json' }).default('[]'),
  sentAt: text('sent_at'),
  createdBy: integer('created_by').default(0),
  updatedBy: integer('updated_by').default(0),
  createdAt: text('created_at').notNull().default(sql`(CURRENT_TIMESTAMP)`),
  updatedAt: text('updated_at').notNull().default(sql`(CURRENT_TIMESTAMP)`),
  version: integer('version').default(0),
  isDeleted: integer('is_deleted', { mode: 'boolean' }).notNull().default(false),
}, (table) => ({
  resendEmailIdIdx: index('idx_email_queue_resend_email_id').on(table.resendEmailId),
}));
