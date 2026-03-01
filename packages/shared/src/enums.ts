// ============================================================
// 枚举值定义
// ============================================================

// 任务状态
export const TASK_STATUS = ['pending', 'processing', 'completed', 'failed'] as const;
export type TaskStatus = typeof TASK_STATUS[number];

// 邮件队列状态
export const EMAIL_QUEUE_STATUS = ['pending', 'sent', 'delivered', 'bounced', 'complained', 'failed'] as const;
export type EmailQueueStatus = typeof EMAIL_QUEUE_STATUS[number];

// 邮件类型
export const EMAIL_TYPE = ['password_reset', 'token_expired', 'system_notify'] as const;
export type EmailType = typeof EMAIL_TYPE[number];

// 任务类型
export const TASK_TYPES = ['DAILY_ATTEND', 'WEEKLY_ATTEND', 'GIFT_CODE_REDEEM', 'EVENT_PARTICIPATE', 'EMAIL_PROCESS'] as const;
export type TaskType = typeof TASK_TYPES[number];

// 日志状态
export const LOG_STATUS = ['success', 'failure', 'skipped'] as const;
export type LogStatus = typeof LOG_STATUS[number];

// 权限类型
export const PERMISSION_TYPE = ['directory', 'menu', 'button'] as const;
export type PermissionType = typeof PERMISSION_TYPE[number];

// 账号提供商类型
export const PROVIDER_TYPE = ['GOOGLE', 'APPLE', 'EMAIL'] as const;
export type ProviderType = typeof PROVIDER_TYPE[number];

// 签到状态
export const ATTENDANCE_STATUS = ['success', 'failure', 'already_completed'] as const;
export type AttendanceStatus = typeof ATTENDANCE_STATUS[number];

// 兑换状态
export const REDEMPTION_STATUS = ['success', 'failure', 'invalid_code', 'already_redeemed'] as const;
export type RedemptionStatus = typeof REDEMPTION_STATUS[number];

// 活动参与状态
export const EVENT_PARTICIPATION_STATUS = ['success', 'failure', 'not_active'] as const;
export type EventParticipationStatus = typeof EVENT_PARTICIPATION_STATUS[number];

// ============================================================
// 中文标签映射
// ============================================================

export const TASK_STATUS_LABEL: Record<TaskStatus, string> = {
  pending: '待处理',
  processing: '处理中',
  completed: '已完成',
  failed: '失败',
};

export const EMAIL_QUEUE_STATUS_LABEL: Record<EmailQueueStatus, string> = {
  pending: '待发送',
  sent: '已发送',
  delivered: '已送达',
  bounced: '退信',
  complained: '投诉',
  failed: '发送失败',
};

export const EMAIL_TYPE_LABEL: Record<EmailType, string> = {
  password_reset: '密码重置',
  token_expired: 'Token 过期通知',
  system_notify: '系统通知',
};

export const LOG_STATUS_LABEL: Record<LogStatus, string> = {
  success: '成功',
  failure: '失败',
  skipped: '已跳过',
};

export const PERMISSION_TYPE_LABEL: Record<PermissionType, string> = {
  directory: '目录',
  menu: '菜单',
  button: '按钮',
};

export const PROVIDER_TYPE_LABEL: Record<ProviderType, string> = {
  GOOGLE: 'Google',
  APPLE: 'Apple',
  EMAIL: '邮箱',
};

export const ATTENDANCE_STATUS_LABEL: Record<AttendanceStatus, string> = {
  success: '签到成功',
  failure: '签到失败',
  already_completed: '已签到',
};

export const REDEMPTION_STATUS_LABEL: Record<RedemptionStatus, string> = {
  success: '兑换成功',
  failure: '兑换失败',
  invalid_code: '无效码',
  already_redeemed: '已兑换',
};

export const EVENT_PARTICIPATION_STATUS_LABEL: Record<EventParticipationStatus, string> = {
  success: '参与成功',
  failure: '参与失败',
  not_active: '活动未开启',
};

// ============================================================
// Naive UI 选项数组 ({ label, value }[])
// ============================================================

const toOptions = <T extends string>(values: readonly T[], labels: Record<T, string>) =>
  values.map(v => ({ label: labels[v], value: v }));

export const TASK_STATUS_OPTIONS = toOptions(TASK_STATUS, TASK_STATUS_LABEL);
export const EMAIL_QUEUE_STATUS_OPTIONS = toOptions(EMAIL_QUEUE_STATUS, EMAIL_QUEUE_STATUS_LABEL);
export const EMAIL_TYPE_OPTIONS = toOptions(EMAIL_TYPE, EMAIL_TYPE_LABEL);
export const LOG_STATUS_OPTIONS = toOptions(LOG_STATUS, LOG_STATUS_LABEL);
export const PERMISSION_TYPE_OPTIONS = toOptions(PERMISSION_TYPE, PERMISSION_TYPE_LABEL);
export const PROVIDER_TYPE_OPTIONS = toOptions(PROVIDER_TYPE, PROVIDER_TYPE_LABEL);
export const ATTENDANCE_STATUS_OPTIONS = toOptions(ATTENDANCE_STATUS, ATTENDANCE_STATUS_LABEL);
export const REDEMPTION_STATUS_OPTIONS = toOptions(REDEMPTION_STATUS, REDEMPTION_STATUS_LABEL);
export const EVENT_PARTICIPATION_STATUS_OPTIONS = toOptions(EVENT_PARTICIPATION_STATUS, EVENT_PARTICIPATION_STATUS_LABEL);
