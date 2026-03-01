import { z } from 'zod';

export const eventParticipationLogSchema = z.object({
  id: z.number().int(),
  gameAccountId: z.number().int(),
  eventScheduleId: z.number().int().nullable().optional(),
  participationResult: z.number().int().optional(),
  responseMsg: z.string().nullable().optional(),
  taskId: z.number().int().nullable().optional(),
  createdBy: z.number().int().optional(),
  updatedBy: z.number().int().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
  version: z.number().int().optional(),
  isDeleted: z.boolean().optional(),
});

export const createEventParticipationLogSchema = eventParticipationLogSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const updateEventParticipationLogSchema = createEventParticipationLogSchema.partial();
