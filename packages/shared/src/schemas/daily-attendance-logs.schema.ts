import { z } from 'zod';

export const dailyAttendanceLogSchema = z.object({
  id: z.number().int(),
  gameAccountId: z.number().int(),
  attendanceDate: z.string().min(1),
  status: z.number().int().optional(),
  responseMsg: z.string().nullable().optional(),
  createdBy: z.number().int().optional(),
  updatedBy: z.number().int().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
  version: z.number().int().optional(),
  isDeleted: z.boolean().optional(),
});

export const createDailyAttendanceLogSchema = dailyAttendanceLogSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const updateDailyAttendanceLogSchema = createDailyAttendanceLogSchema.partial();
