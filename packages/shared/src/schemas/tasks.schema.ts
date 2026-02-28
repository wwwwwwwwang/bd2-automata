import { z } from 'zod';
import { TASK_STATUS } from '../enums';

// Zod schema for creating a task, aligned with the new database schema
export const createTaskSchema = z.object({
  taskType: z.string().min(1, { message: 'Task type cannot be empty' }),
  payload: z.record(z.unknown()).optional().default({}),
});

// Zod schema for updating a task
export const updateTaskSchema = z.object({
  payload: z.record(z.unknown()).optional(),
  status: z.enum(TASK_STATUS).optional(),
  retryCount: z.number().int().min(0).optional(),
  maxRetries: z.number().int().min(0).optional(),
  nextRetryAt: z.string().datetime().optional().nullable(),
  executionHistory: z.array(z.record(z.unknown())).optional(),
});

