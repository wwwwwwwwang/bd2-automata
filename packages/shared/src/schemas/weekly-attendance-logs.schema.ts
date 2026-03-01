import { z } from 'zod';

export const weeklyAttendanceLogSchema = z.object({
  id: z.number().int(),
  gameAccountId: z.number().int(),
  weekIdentifier: z.string().min(1),
  status: z.number().int().optional(),
  responseMsg: z.string().nullable().optional(),
  createdBy: z.number().int().optional(),
  updatedBy: z.number().int().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
  version: z.number().int().optional(),
  isDeleted: z.boolean().optional(),
});

export const createWeeklyAttendanceLogSchema = weeklyAttendanceLogSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const updateWeeklyAttendanceLogSchema = createWeeklyAttendanceLogSchema.partial();
