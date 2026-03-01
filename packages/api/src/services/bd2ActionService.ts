/**
 * BD2 游戏操作核心业务服务
 *
 * 封装所有需要与 BD2 外部平台交互的操作（日签、周签、活动签、兑换码），
 * 每个操作分两个层级：
 *
 *  - perform*(d1, account)   单账号版本，被手动触发路由和批量函数共同调用
 *  - run*ForAll(d1)          批量版本，由 cron handler 调用，自动遍历所有活跃账号
 *
 * 日志写入规则（status 字段含义）：
 *  1 = 成功
 *  0 = 失败（网络错误、token 过期等）
 *  2 = 已完成（今日/本周已签到，或码已兑换）
 */

import { and, eq, inArray } from 'drizzle-orm';
import type { SQL } from 'drizzle-orm';
import {
  gameAccounts,
  dailyAttendanceLogs,
  weeklyAttendanceLogs,
  eventParticipationLogs,
  redemptionLogs,
  giftCodes,
} from '@bd2-automata/shared';
import { getDb } from '../db/drizzle';
import {
  getSession,
  dailyAttend,
  weeklyAttend,
  getEventInfo,
  attendEvent,
  redeemCoupon,
} from '../bd2';

// ─── 类型定义 ─────────────────────────────────────────────────────────────────

type Db = ReturnType<typeof getDb>;

/** gameAccounts 表中单条记录的类型 */
type GameAccount = typeof gameAccounts.$inferSelect;

/** 单账号单次操作的结果 */
export interface ActionResult {
  /** 游戏账号 ID */
  gameAccountId: number;
  /** 游戏昵称，便于日志追踪 */
  gameNickname: string;
  /** 操作是否成功（含幂等跳过） */
  success: boolean;
  /** 是否为幂等跳过（今日已签、码已兑换等），success 为 true 时有意义 */
  skipped: boolean;
  /** 结果描述（已完成、失败原因等） */
  message: string;
}

/** 批量操作的汇总结果 */
export interface BatchResult {
  /** 参与本次批量处理的账号总数 */
  total: number;
  /** 成功数量 */
  succeeded: number;
  /** 已完成（幂等跳过）数量 */
  alreadyCompleted: number;
  /** 失败数量 */
  failed: number;
  /** 每个账号的详细结果 */
  details: ActionResult[];
}

// ─── 工具函数 ─────────────────────────────────────────────────────────────────

/** 获取当前 UTC 日期，格式 YYYY-MM-DD（用于 dailyAttendanceLogs.attendanceDate） */
const todayUtc = () => new Date().toISOString().slice(0, 10);

/**
 * 获取当前 ISO 8601 UTC 周标识，格式 YYYY-WW（用于 weeklyAttendanceLogs.weekIdentifier）
 * 例：2025-52。ISO 第一周定义为包含当年第一个星期四的那一周。
 */
const currentWeekUtc = (): string => {
  const now = new Date();
  const year = now.getUTCFullYear();
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const startOfWeek1 = new Date(jan4);
  startOfWeek1.setUTCDate(jan4.getUTCDate() - ((jan4.getUTCDay() + 6) % 7));
  const weekNum = Math.floor((now.getTime() - startOfWeek1.getTime()) / (7 * 86400000)) + 1;
  if (weekNum < 1) {
    const prevYear = year - 1;
    const prevJan4 = new Date(Date.UTC(prevYear, 0, 4));
    const prevStart = new Date(prevJan4);
    prevStart.setUTCDate(prevJan4.getUTCDate() - ((prevJan4.getUTCDay() + 6) % 7));
    const prevWeek = Math.floor((now.getTime() - prevStart.getTime()) / (7 * 86400000)) + 1;
    return `${prevYear}-${String(prevWeek).padStart(2, '0')}`;
  }
  return `${year}-${String(weekNum).padStart(2, '0')}`;
};

/**
 * 查询所有满足条件的活跃游戏账号。
 * @param db - Drizzle 实例
 * @param extraWhere - 额外的过滤条件（如 eq(gameAccounts.autoDailyAttend, true)），
 *                     不传则只检查 isActive，用于手动触发场景
 */
const fetchActiveAccounts = async (db: Db, extraWhere?: SQL): Promise<GameAccount[]> => {
  const conditions: SQL[] = [eq(gameAccounts.isActive, true), eq(gameAccounts.isDeleted, false)];
  if (extraWhere) conditions.push(extraWhere);
  return db.select().from(gameAccounts).where(and(...conditions)).all();
};

/** 将批量结果列表汇总为 BatchResult */
const summarize = (details: ActionResult[]): BatchResult => ({
  total: details.length,
  succeeded: details.filter(d => d.success && !d.skipped).length,
  alreadyCompleted: details.filter(d => d.skipped).length,
  failed: details.filter(d => !d.success).length,
  details,
});

// ─── 日签（内部实现） ──────────────────────────────────────────────────────────

const _performDailyAttend = async (db: Db, account: GameAccount): Promise<ActionResult> => {
  const base = { gameAccountId: account.id, gameNickname: account.gameNickname };
  try {
    const session = await getSession(account.refreshToken, account.providerType ?? 'GOOGLE');
    const res = await dailyAttend(session.accessToken);

    const alreadyDone = !res.data.success && res.data.errorType === 3;
    const status = res.data.success ? 1 : alreadyDone ? 2 : 0;
    const message = res.data.success ? '成功' : alreadyDone ? '已完成' : (res.data.errorMsg ?? '失败');

    await db.insert(dailyAttendanceLogs).values({
      gameAccountId: account.id,
      attendanceDate: todayUtc(),
      status,
      responseMsg: message,
    }).run();

    return { ...base, success: res.data.success || alreadyDone, skipped: alreadyDone, message };
  } catch (err: any) {
    const message = err?.message ?? '未知错误';
    await db.insert(dailyAttendanceLogs).values({
      gameAccountId: account.id,
      attendanceDate: todayUtc(),
      status: 0,
      responseMsg: message,
    }).run();
    return { ...base, success: false, skipped: false, message };
  }
};

// ─── 周签（内部实现） ──────────────────────────────────────────────────────────

const _performWeeklyAttend = async (db: Db, account: GameAccount): Promise<ActionResult> => {
  const base = { gameAccountId: account.id, gameNickname: account.gameNickname };
  try {
    const session = await getSession(account.refreshToken, account.providerType ?? 'GOOGLE');
    const res = await weeklyAttend(session.accessToken);

    const alreadyDone = !res.data.success && res.data.errorType === 3;
    const status = res.data.success ? 1 : alreadyDone ? 2 : 0;
    const message = res.data.success ? '成功' : alreadyDone ? '已完成' : (res.data.errorMsg ?? '失败');

    await db.insert(weeklyAttendanceLogs).values({
      gameAccountId: account.id,
      weekIdentifier: currentWeekUtc(),
      status,
      responseMsg: message,
    }).run();

    return { ...base, success: res.data.success || alreadyDone, skipped: alreadyDone, message };
  } catch (err: any) {
    const message = err?.message ?? '未知错误';
    await db.insert(weeklyAttendanceLogs).values({
      gameAccountId: account.id,
      weekIdentifier: currentWeekUtc(),
      status: 0,
      responseMsg: message,
    }).run();
    return { ...base, success: false, skipped: false, message };
  }
};

// ─── 活动签（内部实现） ────────────────────────────────────────────────────────

const _performEventAttend = async (
  db: Db,
  account: GameAccount,
  eventScheduleId?: number,
): Promise<ActionResult> => {
  const base = { gameAccountId: account.id, gameNickname: account.gameNickname };
  try {
    const session = await getSession(account.refreshToken, account.providerType ?? 'GOOGLE');

    let scheduleId = eventScheduleId;
    if (!scheduleId) {
      const eventInfo = await getEventInfo();
      scheduleId = eventInfo.data?.scheduleInfo?.eventScheduleId;
      if (!scheduleId) {
        return { ...base, success: false, skipped: false, message: '当前无进行中活动' };
      }
    }

    const res = await attendEvent(session.accessToken, scheduleId);

    const alreadyDone = !res.data.success && (res.data.errorType === 5 || res.data.errorType === 6);
    const status = res.data.success ? 1 : alreadyDone ? 2 : 0;
    const message = res.data.success ? '成功' : alreadyDone ? '已完成' : (res.data.errorMsg ?? '失败');

    await db.insert(eventParticipationLogs).values({
      gameAccountId: account.id,
      eventScheduleId: scheduleId,
      participationResult: status,
      responseMsg: message,
    }).run();

    return { ...base, success: res.data.success || alreadyDone, skipped: alreadyDone, message };
  } catch (err: any) {
    const message = err?.message ?? '未知错误';
    await db.insert(eventParticipationLogs).values({
      gameAccountId: account.id,
      eventScheduleId: eventScheduleId ?? null,
      participationResult: 0,
      responseMsg: message,
    }).run();
    return { ...base, success: false, skipped: false, message };
  }
};

// ─── 兑换码（内部实现） ────────────────────────────────────────────────────────

const _performRedeemCoupons = async (
  db: Db,
  account: GameAccount,
  codes?: Array<{ id: number; code: string }>,
): Promise<ActionResult[]> => {
  const base = { gameAccountId: account.id, gameNickname: account.gameNickname };

  const allCodes = codes ?? await db.select({ id: giftCodes.id, code: giftCodes.code })
    .from(giftCodes)
    .where(and(
      eq(giftCodes.isActive, true),
      eq(giftCodes.isDeleted, false),
    ))
    .all();

  if (allCodes.length === 0) return [];

  const redeemedLogs = await db.select({ giftCodeId: redemptionLogs.giftCodeId })
    .from(redemptionLogs)
    .where(and(
      eq(redemptionLogs.gameAccountId, account.id),
      eq(redemptionLogs.isDeleted, false),
      inArray(redemptionLogs.giftCodeId, allCodes.map(c => c.id)),
    ))
    .all();
  const redeemedIds = new Set(redeemedLogs.map(r => r.giftCodeId));

  const pending = allCodes.filter(c => !redeemedIds.has(c.id));
  if (pending.length === 0) return [];

  let session: Awaited<ReturnType<typeof getSession>>;
  try {
    session = await getSession(account.refreshToken, account.providerType ?? 'GOOGLE');
  } catch (err: any) {
    return pending.map(() => ({ ...base, success: false, skipped: false, message: `获取 session 失败: ${err?.message}` }));
  }

  const results: ActionResult[] = [];
  for (const c of pending) {
    try {
      const res = await redeemCoupon(session.userId, c.code);
      const alreadyUsed = res.errorCode === 'AlreadyUsed';
      const ok = !res.errorCode || alreadyUsed;
      const message = res.errorCode
        ? alreadyUsed ? '已完成' : `失败: ${res.errorCode}`
        : '成功';

      await db.insert(redemptionLogs).values({
        gameAccountId: account.id,
        giftCodeId: c.id,
        codeUsed: c.code,
        redeemResult: ok ? (alreadyUsed ? 2 : 1) : 0,
        responseMsg: message,
      }).run();

      results.push({ ...base, success: ok, skipped: alreadyUsed, message });
    } catch (err: any) {
      const message = err?.message ?? '未知错误';
      await db.insert(redemptionLogs).values({
        gameAccountId: account.id,
        giftCodeId: c.id,
        codeUsed: c.code,
        redeemResult: 0,
        responseMsg: message,
      }).run();
      results.push({ ...base, success: false, skipped: false, message });
    }
  }

  return results;
};

// ─── 日签 ─────────────────────────────────────────────────────────────────────

/**
 * 对单个账号执行日签，并将结果写入 dailyAttendanceLogs。
 */
export const performDailyAttend = async (d1: D1Database, account: GameAccount): Promise<ActionResult> => {
  return _performDailyAttend(getDb(d1), account);
};

/**
 * 批量对所有开启 autoDailyAttend 的活跃账号执行日签。
 * 由 DailyAttendHandler 调用。
 * 预先查询本日已签成功的账号并跳过，避免无效的外部 API 调用。
 */
export const runDailyAttendForAll = async (d1: D1Database): Promise<BatchResult> => {
  const db = getDb(d1);
  const accounts = await fetchActiveAccounts(db, eq(gameAccounts.autoDailyAttend, true));
  if (accounts.length === 0) return summarize([]);

  const today = todayUtc();
  const doneLogs = await db.select({ gameAccountId: dailyAttendanceLogs.gameAccountId })
    .from(dailyAttendanceLogs)
    .where(and(
      eq(dailyAttendanceLogs.attendanceDate, today),
      eq(dailyAttendanceLogs.status, 1),
      eq(dailyAttendanceLogs.isDeleted, false),
      inArray(dailyAttendanceLogs.gameAccountId, accounts.map(a => a.id)),
    ))
    .all();
  const doneIds = new Set(doneLogs.map(d => d.gameAccountId));

  const skipped: ActionResult[] = accounts
    .filter(a => doneIds.has(a.id))
    .map(a => ({ gameAccountId: a.id, gameNickname: a.gameNickname, success: true, skipped: true, message: '已完成' }));

  const pending = accounts.filter(a => !doneIds.has(a.id));
  const executed = await Promise.all(pending.map(a => _performDailyAttend(db, a)));
  return summarize([...skipped, ...executed]);
};

// ─── 周签 ─────────────────────────────────────────────────────────────────────

/**
 * 对单个账号执行周签，并将结果写入 weeklyAttendanceLogs。
 */
export const performWeeklyAttend = async (d1: D1Database, account: GameAccount): Promise<ActionResult> => {
  return _performWeeklyAttend(getDb(d1), account);
};

/**
 * 批量对所有开启 autoWeeklyAttend 的活跃账号执行周签。
 * 由 WeeklyAttendHandler 调用。
 * 预先查询本周已签成功的账号并跳过，避免无效的外部 API 调用。
 */
export const runWeeklyAttendForAll = async (d1: D1Database): Promise<BatchResult> => {
  const db = getDb(d1);
  const accounts = await fetchActiveAccounts(db, eq(gameAccounts.autoWeeklyAttend, true));
  if (accounts.length === 0) return summarize([]);

  const week = currentWeekUtc();
  const doneLogs = await db.select({ gameAccountId: weeklyAttendanceLogs.gameAccountId })
    .from(weeklyAttendanceLogs)
    .where(and(
      eq(weeklyAttendanceLogs.weekIdentifier, week),
      eq(weeklyAttendanceLogs.status, 1),
      eq(weeklyAttendanceLogs.isDeleted, false),
      inArray(weeklyAttendanceLogs.gameAccountId, accounts.map(a => a.id)),
    ))
    .all();
  const doneIds = new Set(doneLogs.map(d => d.gameAccountId));

  const skipped: ActionResult[] = accounts
    .filter(a => doneIds.has(a.id))
    .map(a => ({ gameAccountId: a.id, gameNickname: a.gameNickname, success: true, skipped: true, message: '已完成' }));

  const pending = accounts.filter(a => !doneIds.has(a.id));
  const executed = await Promise.all(pending.map(a => _performWeeklyAttend(db, a)));
  return summarize([...skipped, ...executed]);
};

// ─── 活动签 ───────────────────────────────────────────────────────────────────

/**
 * 对单个账号执行当前活动签到，并将结果写入 eventParticipationLogs。
 *
 * @param d1 - D1Database 绑定
 * @param account - 游戏账号记录
 * @param eventScheduleId - 可选，若已知可直接传入，否则自动从 getEventInfo() 获取
 */
export const performEventAttend = async (
  d1: D1Database,
  account: GameAccount,
  eventScheduleId?: number,
): Promise<ActionResult> => {
  return _performEventAttend(getDb(d1), account, eventScheduleId);
};

/**
 * 批量对所有开启 autoEventAttend 的活跃账号执行活动签到。
 * 先统一获取一次 eventScheduleId，再并发处理各账号，避免重复调用公开接口。
 * 由 EventParticipateHandler 调用。
 */
export const runEventAttendForAll = async (d1: D1Database): Promise<BatchResult> => {
  let eventScheduleId: number | undefined;
  try {
    const eventInfo = await getEventInfo();
    eventScheduleId = eventInfo.data?.scheduleInfo?.eventScheduleId;
  } catch {
    // getEventInfo 失败时让 _performEventAttend 各自处理
  }

  if (!eventScheduleId) {
    return { total: 0, succeeded: 0, alreadyCompleted: 0, failed: 0, details: [] };
  }

  const db = getDb(d1);
  const accounts = await fetchActiveAccounts(db, eq(gameAccounts.autoEventAttend, true));
  const details = await Promise.all(accounts.map(a => _performEventAttend(db, a, eventScheduleId)));
  return summarize(details);
};

// ─── 兑换码 ───────────────────────────────────────────────────────────────────

/**
 * 对单个账号兑换所有尚未兑换的活跃礼包码，并将结果写入 redemptionLogs。
 *
 * @param d1 - D1Database 绑定
 * @param account - 游戏账号记录
 * @param codes - 可选，指定要兑换的礼包码列表；不传则自动查询所有活跃码
 */
export const performRedeemCoupons = async (
  d1: D1Database,
  account: GameAccount,
  codes?: Array<{ id: number; code: string }>,
): Promise<ActionResult[]> => {
  return _performRedeemCoupons(getDb(d1), account, codes);
};

/**
 * 批量对所有开启 autoRedeem 的活跃账号兑换所有活跃礼包码。
 * 由 GiftCodeRedeemHandler 调用。
 */
export const runRedeemCouponsForAll = async (d1: D1Database): Promise<BatchResult> => {
  const db = getDb(d1);
  const activeCodes = await db.select({ id: giftCodes.id, code: giftCodes.code })
    .from(giftCodes)
    .where(and(eq(giftCodes.isActive, true), eq(giftCodes.isDeleted, false)))
    .all();

  if (activeCodes.length === 0) {
    return { total: 0, succeeded: 0, alreadyCompleted: 0, failed: 0, details: [] };
  }

  const accounts = await fetchActiveAccounts(db, eq(gameAccounts.autoRedeem, true));
  const allDetails = await Promise.all(
    accounts.map(a => _performRedeemCoupons(db, a, activeCodes)),
  );
  return summarize(allDetails.flat());
};
