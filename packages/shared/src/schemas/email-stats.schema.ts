import { z } from 'zod';

export const emailStatsSchema = z.object({
  id: z.number().int(),
  statDate: z.string().min(1),
  totalSent: z.number().int().optional(),
  totalDelivered: z.number().int().optional(),
  totalFailed: z.number().int().optional(),
  totalBounced: z.number().int().optional(),
  totalComplained: z.number().int().optional(),
  totalPending: z.number().int().optional(),
  passwordResetCount: z.number().int().optional(),
  tokenExpiredCount: z.number().int().optional(),
  systemNotifyCount: z.number().int().optional(),
  createdBy: z.number().int().optional(),
  updatedBy: z.number().int().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
  version: z.number().int().optional(),
  isDeleted: z.boolean().optional(),
});

export const createEmailStatsSchema = emailStatsSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const updateEmailStatsSchema = createEmailStatsSchema.partial();
