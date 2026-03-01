import { z } from 'zod';
import { LOG_STATUS } from '../enums';

export const taskLogSchema = z.object({
  id: z.number().int(),
  taskId: z.number().int().nullable().optional(),
  gameAccountId: z.number().int().nullable().optional(),
  status: z.enum(LOG_STATUS),
  message: z.string().nullable().optional(),
  details: z.record(z.unknown()).nullable().optional(),
  executedAt: z.string().optional(),
  isDeleted: z.boolean().optional(),
});

export const createTaskLogSchema = taskLogSchema.omit({
  id: true,
  executedAt: true,
});

export const updateTaskLogSchema = createTaskLogSchema.partial();
