import { z } from 'zod';

// 创建邮件模板的校验 Schema
export const createEmailTemplateSchema = z.object({
  name: z.string().min(1, '模板标识不能为空'),
  displayName: z.string().min(1, '显示名称不能为空'),
  subject: z.string().min(1, '邮件主题不能为空'),
  htmlContent: z.string().min(1, 'HTML 内容不能为空'),
  description: z.string().optional(),
  availableVars: z.array(z.string()).optional(),
  isActive: z.boolean().optional().default(true),
});

// 更新邮件模板的校验 Schema
export const updateEmailTemplateSchema = createEmailTemplateSchema.partial();
