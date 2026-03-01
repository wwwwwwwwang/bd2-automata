import { z } from 'zod';
import { TASK_TYPES } from '../enums';

export const cronConfigSchema = z.object({
  taskType: z.enum(TASK_TYPES),
  cronExpression: z.string().min(1, 'Cron expression cannot be empty'),
  isActive: z.boolean().optional().default(true),
});

export const createCronConfigSchema = cronConfigSchema;
export const updateCronConfigSchema = cronConfigSchema.partial();
