import { getDb } from '../db/drizzle';
import { and, eq, inArray, sql } from 'drizzle-orm';
import { emailQueue, emailStats } from '@bd2-automata/shared';

const EVENT_TO_STATUS: Record<string, string> = {
  'email.sent': 'sent',
  'email.delivered': 'delivered',
  'email.bounced': 'bounced',
  'email.complained': 'complained',
  'email.failed': 'failed',
};

// 每个目标状态允许从哪些前置状态转移
const ALLOWED_FROM: Record<string, string[]> = {
  sent: ['pending'],
  delivered: ['pending', 'sent'],
  bounced: ['pending', 'sent'],
  complained: ['pending', 'sent'],
  failed: ['pending', 'sent'],
};

export const handleResendWebhook = async (
  d1: D1Database,
  event: { type: string; data: { email_id: string } },
) => {
  const newStatus = EVENT_TO_STATUS[event.type];
  if (!newStatus) return;

  const allowedFrom = ALLOWED_FROM[newStatus];
  if (!allowedFrom) return;

  const db = getDb(d1);

  // 原子更新：WHERE 条件包含状态约束，避免竞态
  const result = await db.update(emailQueue).set({
    status: newStatus as any,
    updatedAt: new Date().toISOString(),
  }).where(
    and(
      eq(emailQueue.resendEmailId, event.data.email_id),
      inArray(emailQueue.status, allowedFrom as any),
    ),
  ).returning({ id: emailQueue.id });

  // 未匹配到行 = 记录不存在 / 状态已是终态 → 幂等跳过
  if (!result.length) return;

  const today = new Date().toISOString().slice(0, 10);
  if (newStatus === 'delivered') {
    await db.insert(emailStats).values({ statDate: today, totalDelivered: 1 })
      .onConflictDoUpdate({
        target: emailStats.statDate,
        set: { totalDelivered: sql`${emailStats.totalDelivered} + 1`, updatedAt: new Date().toISOString() },
      });
  } else if (newStatus === 'bounced') {
    await db.insert(emailStats).values({ statDate: today, totalBounced: 1 })
      .onConflictDoUpdate({
        target: emailStats.statDate,
        set: { totalBounced: sql`${emailStats.totalBounced} + 1`, updatedAt: new Date().toISOString() },
      });
  } else if (newStatus === 'complained') {
    await db.insert(emailStats).values({ statDate: today, totalComplained: 1 })
      .onConflictDoUpdate({
        target: emailStats.statDate,
        set: { totalComplained: sql`${emailStats.totalComplained} + 1`, updatedAt: new Date().toISOString() },
      });
  }
};
