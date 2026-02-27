import { CronExpressionParser } from 'cron-parser';

export function isCronMatchNow(cronExpression: string): boolean {
  // 定义一个 61 秒的匹配窗口，以容忍 Cloudflare Cron Trigger 可能存在的轻微执行延迟。
  const MATCH_WINDOW_MS = 61 * 1000;
  // 强制所有 Cron 解析都在 UTC 时区下进行，以确保在任何环境下行为一致。
  const DEFAULT_TZ = 'UTC';

  try {
    // 获取当前时间，作为计算的基准。
    const now = new Date();

    // 使用 cron-parser 解析表达式。
    // 关键在于传入 `currentDate` 和 `tz` 选项，以获得一个相对于当前 UTC 时间的、可预测的迭代器。
    const interval = CronExpressionParser.parse(cronExpression, {
      currentDate: now,
      tz: DEFAULT_TZ,
    });

    // 从当前时间点向前回溯，找到上一个预定的执行时间点。
    const previousExecution = interval.prev().getTime();

    // 检查上一个执行时间点是否落在“当前时间 - 匹配窗口”这个时间范围内。
    // 如果是，则意味着任务在本分钟内“到期”，应该被触发。
    return previousExecution >= now.getTime() - MATCH_WINDOW_MS;
  } catch (err) {
    // 如果 Cron 表达式无效，则捕获错误并返回 false。
    console.error(`无效的 Cron 表达式 "${cronExpression}":`, err);
    return false;
  }
}

/**
 * 计算下一次重试的时间戳（毫秒）。
 * 使用带有最大延迟上限和正负随机抖动的指数退避策略，以实现更平滑、更健壮的重试行为。
 *
 * @param retryCount 当前的重试次数
 * @returns {number} 下一次重试的毫秒级 Unix 时间戳
 */
export function calculateNextRetry(retryCount: number): number {
  // 基础延迟，作为指数增长的起点
  const baseDelay = 60 * 1000; // 1分钟

  // 设置一个最长延迟上限，防止重试间隔无限增长，导致任务被事实性遗弃
  const maxDelay = 24 * 60 * 60 * 1000; // 24小时

  // 计算指数增长的延迟时间
  const exponential = baseDelay * Math.pow(2, retryCount);

  // 取指数延迟和最大延迟中的较小者，实现“熔断”效果
  const capped = Math.min(exponential, maxDelay);

  // 增加一个正负均匀分布的随机抖动（-15秒到+15秒），以打散重试请求，避免流量高峰
  const jitter = (Math.random() - 0.5) * 30_000;

  return Date.now() + capped + jitter;
}