/**
 * BD2 Web 商店签到与活动相关类型定义
 *
 * 涵盖两类操作：
 *  1. 常规签到（/api/attend）：日签（10 钻）、周签（3 抽）
 *  2. 活动签到（/api/event/*）：限时活动每日签到奖励
 */

// ─── 常规签到（/api/attend）────────────────────────────────────────────────────

/**
 * 签到奖励单条记录
 */
export interface AttendRewardInfo {
  /** 道具类型 ID */
  itemType: number;
  /** 道具 ID */
  itemId: number;
}

/**
 * POST /api/attend 响应中 data 字段的结构
 * success=false 时需检查 errorType 判断原因
 */
export interface AttendData {
  /** 是否签到成功 */
  success: boolean;
  /**
   * 错误类型（success=false 时有意义）：
   *  3 = 今日/本周已签到（Already attendance reward）
   */
  errorType: number;
  errorMsg: string;
  requestId: string;
  /** 上次签到时间（已签到时返回，未签到时为空字符串） */
  lastAttendanceDate: string;
  /** 本次签到获得的奖励列表 */
  rewardInfo: AttendRewardInfo[];
}

/**
 * POST /api/attend 完整响应结构
 * type=0 对应日签（每日 10 钻），type=1 对应周签（每周 3 抽）
 */
export interface AttendResponse {
  code: string;
  message: string;
  data: AttendData;
}

// ─── 活动签到（/api/event/*）─────────────────────────────────────────────────

/**
 * 活动日程信息，包含活动时间范围和每日奖励配置
 */
export interface EventScheduleInfo {
  /** 活动开始时间，格式 "YYYY-MM-DD HH:mm:ss" */
  startDate: string;
  /** 活动结束时间，格式 "YYYY-MM-DD HH:mm:ss" */
  endDate: string;
  /** 活动日程 ID，用于 attendEvent 接口的 eventScheduleId 参数 */
  eventScheduleId: number;
  /** 每日奖励配置列表（GET /api/event/event-info 时返回，user-info 时不返回） */
  rewardInfoList?: Array<{
    /** 第几天（1-based） */
    day: number;
    itemType: number;
    itemId: number;
  }>;
}

/**
 * GET /api/event/event-info 响应中 data 字段的结构
 * attendanceCount=-1 表示该接口不含用户签到状态（公开接口）
 */
export interface EventInfoData {
  /** 当前活动总签到次数（公开接口返回 -1） */
  attendanceCount: number;
  isLastAttendance: boolean;
  success: boolean;
  errorType: number;
  errorMsg: string;
  requestId: string;
  scheduleInfo: EventScheduleInfo;
}

/**
 * GET /api/event/event-info 完整响应结构（公开接口，无需 token）
 */
export interface EventInfoResponse {
  data: EventInfoData;
}

/**
 * 活动签到奖励信息
 */
export interface EventAttendRewardInfo {
  itemType: number;
  itemId: number;
}

/**
 * 活动签到后返回的用户签到状态
 */
export interface EventAttendUserInfo {
  /** 本活动周期内已签到天数 */
  attendanceCount: number;
  /** 最后一次签到时间 */
  lastAttendanceDate: string;
}

/**
 * POST /api/event/attend-reward 响应中 data 字段的结构
 * success=false 时需检查 errorType：
 *  4 = 活动不存在（Not found event schedule）
 *  5 = 今日已签到（Already reward today）
 *  6 = 活动已完成所有天数（Not exist reward day）
 */
export interface EventAttendData {
  success: boolean;
  errorType: number;
  errorMsg: string;
  requestId: string;
  rewardInfo: EventAttendRewardInfo;
  userInfo: EventAttendUserInfo;
}

/**
 * POST /api/event/attend-reward 完整响应结构（需携带 Bearer token）
 */
export interface EventAttendResponse {
  data: EventAttendData;
}

/**
 * POST /api/event/event-user-info 响应中 data 字段的结构
 * 返回当前用户在本活动周期内的签到进度
 */
export interface EventUserInfoData {
  /** 已签到天数 */
  attendanceCount: number;
  /** 是否完成最后一天签到 */
  isLastAttendance: boolean;
  scheduleInfo: {
    startDate: string;
    endDate: string;
    eventScheduleId: number;
  };
}

/**
 * POST /api/event/event-user-info 完整响应结构（需携带 Bearer token）
 */
export interface EventUserInfoResponse {
  data: EventUserInfoData;
}
