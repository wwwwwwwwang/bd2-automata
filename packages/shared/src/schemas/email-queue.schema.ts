import { z } from 'zod';
import { EMAIL_TYPE } from '../enums';

// 创建邮件任务的校验 Schema (通常由系统内部调用)
export const createEmailQueueSchema = z.object({
  userId: z.string(),
  recipientEmail: z.string().email(),
  subject: z.string(),
  htmlContent: z.string(),
  emailType: z.enum(EMAIL_TYPE),
  templateId: z.string().optional(),
  templateVars: z.record(z.unknown()).optional(),
});
