import { zValidator } from '@hono/zod-validator';
import type { ZodSchema } from 'zod';
import type { ValidationTargets } from 'hono';

export const validate = <Target extends keyof ValidationTargets>(
  target: Target,
  schema: ZodSchema,
) =>
  zValidator(target, schema, (result, c) => {
    if (!result.success) {
      const messages = result.error.issues.map((i) => i.message).join('; ');
      return c.json({ success: false, error: messages }, 400);
    }
  });
