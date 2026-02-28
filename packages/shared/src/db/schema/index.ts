/**
 * @file packages/shared/src/db/schema/index.ts
 * @description
 * 这个文件是所有数据库表 Schema 定义的汇集点。
 *
 * 导出策略:
 * 1. 具名导出 (Named Exports): 使用 `export * from '...'` 语句，
 *    将每个独立的表定义对象（如 users, roles）都作为具名成员导出。
 *    这使得 Service 文件可以按需 `import { users } from '@bd2-automata/shared'`。
 * 2. 默认导出 (Default Export): 导入所有独立的表定义，将它们组合成一个大的 `schema` 对象，
 *    并将其作为默认导出。这主要供 Drizzle ORM 初始化时使用。
 */

// --- 1. 具名导出所有独立的表定义 ---
export * from './users';
export * from './roles';
export * from './permissions';
export * from './cron-configs';
export * from './dictionary-types';
export * from './dictionary-items';
export * from './tasks';
export * from './logs';
export * from './gift-codes';
export * from './events';
export * from './game-accounts';
export * from './users-to-roles';
export * from './roles-to-permissions';
export * from './daily-attendance-logs';
export * from './weekly-attendance-logs';
export * from './redemption-logs';
export * from './event-participation-logs';
export * from './distributed-locks';
export * from './refresh-tokens';
export * from './password-reset-tokens';
export * from './email-change-tokens';
export * from './email-templates';
export * from './email-queue';
export * from './email-stats';
export * from './relations';

// --- 2. 组合并默认导出总的 Schema 对象 ---
import * as users from './users';
import * as roles from './roles';
import * as permissions from './permissions';
import * as cronConfigs from './cron-configs';
import * as dictionaryTypes from './dictionary-types';
import * as dictionaryItems from './dictionary-items';
import * as tasks from './tasks';
import * as taskLogs from './logs';
import * as giftCodes from './gift-codes';
import * as events from './events';
import * as gameAccounts from './game-accounts';
import * as usersToRoles from './users-to-roles';
import * as rolesToPermissions from './roles-to-permissions';
import * as dailyAttendanceLogs from './daily-attendance-logs';
import * as weeklyAttendanceLogs from './weekly-attendance-logs';
import * as redemptionLogs from './redemption-logs';
import * as eventParticipationLogs from './event-participation-logs';
import * as distributedLocks from './distributed-locks';
import * as refreshTokens from './refresh-tokens';
import * as passwordResetTokens from './password-reset-tokens';
import * as emailChangeTokens from './email-change-tokens';
import * as emailTemplates from './email-templates';
import * as emailQueue from './email-queue';
import * as emailStats from './email-stats';
import * as relations from './relations';

export const schema = Object.freeze({
  ...users,
  ...roles,
  ...permissions,
  ...cronConfigs,
  ...dictionaryTypes,
  ...dictionaryItems,
  ...tasks,
  ...taskLogs,
  ...giftCodes,
  ...events,
  ...gameAccounts,
  ...usersToRoles,
  ...rolesToPermissions,
  ...dailyAttendanceLogs,
  ...weeklyAttendanceLogs,
  ...redemptionLogs,
  ...eventParticipationLogs,
  ...distributedLocks,
  ...refreshTokens,
  ...passwordResetTokens,
  ...emailChangeTokens,
  ...emailTemplates,
  ...emailQueue,
  ...emailStats,
  ...relations,
});

// 导出 schema 的类型，方便在其他地方进行类型提示
export type AppSchema = typeof schema;

export default schema;
