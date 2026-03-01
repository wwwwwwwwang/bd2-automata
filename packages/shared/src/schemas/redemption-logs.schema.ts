import { z } from 'zod';

export const redemptionLogSchema = z.object({
  id: z.number().int(),
  gameAccountId: z.number().int(),
  giftCodeId: z.number().int().nullable().optional(),
  codeUsed: z.string().min(1),
  redeemResult: z.number().int().optional(),
  responseMsg: z.string().nullable().optional(),
  taskId: z.number().int().nullable().optional(),
  createdBy: z.number().int().optional(),
  updatedBy: z.number().int().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
  version: z.number().int().optional(),
  isDeleted: z.boolean().optional(),
});

export const createRedemptionLogSchema = redemptionLogSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const updateRedemptionLogSchema = createRedemptionLogSchema.partial();
