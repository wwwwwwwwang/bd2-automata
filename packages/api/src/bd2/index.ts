/**
 * BD2 外部 API 统一入口
 *
 * 对外暴露所有与 BD2 游戏平台交互所需的函数和类型。
 * cron handler 只需从此文件导入，无需关心内部目录结构。
 *
 * 模块职责：
 *  - auth/session : getSession()           登录并获取 BD2 会话（accessToken + userId）
 *  - webshop/attend: dailyAttend()         日签（10 钻）
 *                    weeklyAttend()        周签（3 抽）
 *  - webshop/event : getEventInfo()        获取当前活动信息（无需 token）
 *                    attendEvent()         活动签到
 *                    getUserEventInfo()    查询用户活动签到进度
 *  - redeem/pulse  : fetchAvailableCodes() 拉取第三方兑换码列表
 *  - redeem/coupon : redeemCoupon()        提交兑换码到官方端点
 */

export { getSession } from './auth/session';
export type { Bd2Session } from './auth/types';

export { dailyAttend, weeklyAttend } from './webshop/attend';
export { getEventInfo, attendEvent, getUserEventInfo } from './webshop/event';

export { fetchAvailableCodes } from './redeem/pulse';
export { redeemCoupon } from './redeem/coupon';
