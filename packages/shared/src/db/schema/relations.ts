import { relations } from 'drizzle-orm';
import { users } from './users';
import { gameAccounts } from './game-accounts';
import { roles } from './roles';
import { permissions } from './permissions';
import { usersToRoles } from './users-to-roles';
import { rolesToPermissions } from './roles-to-permissions';
import { dictionaryItems } from './dictionary-items';
import { dictionaries } from './dictionary-types';
import { taskLogs } from './logs';
import { tasks } from './tasks';
import { refreshTokens } from './refresh-tokens';
import { passwordResetTokens } from './password-reset-tokens';
import { emailChangeTokens } from './email-change-tokens';
import { emailQueue } from './email-queue';
import { emailTemplates } from './email-templates';
import { dailyAttendanceLogs } from './daily-attendance-logs';
import { weeklyAttendanceLogs } from './weekly-attendance-logs';
import { redemptionLogs } from './redemption-logs';
import { eventParticipationLogs } from './event-participation-logs';
import { giftCodes } from './gift-codes';
import { eventSchedules } from './events';

// ===================================================================
// Users
// ===================================================================
export const usersRelations = relations(users, ({ many }) => ({
  usersToRoles: many(usersToRoles),
  gameAccounts: many(gameAccounts),
  taskLogs: many(taskLogs),
  refreshTokens: many(refreshTokens),
  passwordResetTokens: many(passwordResetTokens),
  emailChangeTokens: many(emailChangeTokens),
  emailQueue: many(emailQueue),
}));

// ===================================================================
// Roles & Permissions
// ===================================================================
export const rolesRelations = relations(roles, ({ many }) => ({
  usersToRoles: many(usersToRoles),
  rolesToPermissions: many(rolesToPermissions),
}));

export const permissionsRelations = relations(permissions, ({ one, many }) => ({
  rolesToPermissions: many(rolesToPermissions),
  parent: one(permissions, {
    fields: [permissions.parentId],
    references: [permissions.id],
    relationName: 'parentPermission',
  }),
  children: many(permissions, { relationName: 'parentPermission' }),
}));

export const usersToRolesRelations = relations(usersToRoles, ({ one }) => ({
  role: one(roles, {
    fields: [usersToRoles.roleId],
    references: [roles.id],
  }),
  user: one(users, {
    fields: [usersToRoles.userId],
    references: [users.id],
  }),
}));

export const rolesToPermissionsRelations = relations(rolesToPermissions, ({ one }) => ({
  role: one(roles, {
    fields: [rolesToPermissions.roleId],
    references: [roles.id],
  }),
  permission: one(permissions, {
    fields: [rolesToPermissions.permissionId],
    references: [permissions.id],
  }),
}));

// ===================================================================
// Game Accounts
// ===================================================================
export const gameAccountsRelations = relations(gameAccounts, ({ one, many }) => ({
  user: one(users, {
    fields: [gameAccounts.userId],
    references: [users.id],
  }),
  dailyAttendanceLogs: many(dailyAttendanceLogs),
  weeklyAttendanceLogs: many(weeklyAttendanceLogs),
  redemptionLogs: many(redemptionLogs),
  eventParticipationLogs: many(eventParticipationLogs),
  tasks: many(tasks),
}));

// ===================================================================
// Tasks & Logs
// ===================================================================
export const tasksRelations = relations(tasks, ({ one, many }) => ({
  gameAccount: one(gameAccounts, {
    fields: [tasks.accountId],
    references: [gameAccounts.id],
  }),
  taskLogs: many(taskLogs),
}));

export const taskLogsRelations = relations(taskLogs, ({ one }) => ({
  task: one(tasks, {
    fields: [taskLogs.taskId],
    references: [tasks.id],
  }),
  gameAccount: one(gameAccounts, {
    fields: [taskLogs.gameAccountId],
    references: [gameAccounts.id],
  }),
}));

// ===================================================================
// Business Logs
// ===================================================================
export const dailyAttendanceLogsRelations = relations(dailyAttendanceLogs, ({ one }) => ({
  gameAccount: one(gameAccounts, {
    fields: [dailyAttendanceLogs.gameAccountId],
    references: [gameAccounts.id],
  }),
}));

export const weeklyAttendanceLogsRelations = relations(weeklyAttendanceLogs, ({ one }) => ({
  gameAccount: one(gameAccounts, {
    fields: [weeklyAttendanceLogs.gameAccountId],
    references: [gameAccounts.id],
  }),
}));

export const redemptionLogsRelations = relations(redemptionLogs, ({ one }) => ({
  gameAccount: one(gameAccounts, {
    fields: [redemptionLogs.gameAccountId],
    references: [gameAccounts.id],
  }),
  giftCode: one(giftCodes, {
    fields: [redemptionLogs.giftCodeId],
    references: [giftCodes.id],
  }),
}));

export const eventParticipationLogsRelations = relations(eventParticipationLogs, ({ one }) => ({
  gameAccount: one(gameAccounts, {
    fields: [eventParticipationLogs.gameAccountId],
    references: [gameAccounts.id],
  }),
  eventSchedule: one(eventSchedules, {
    fields: [eventParticipationLogs.eventScheduleId],
    references: [eventSchedules.eventScheduleId],
  }),
}));

// ===================================================================
// Dictionaries
// ===================================================================
export const dictionariesRelations = relations(dictionaries, ({ many }) => ({
  items: many(dictionaryItems),
}));

export const dictionaryItemsRelations = relations(dictionaryItems, ({ one }) => ({
  dictionary: one(dictionaries, {
    fields: [dictionaryItems.dictionaryId],
    references: [dictionaries.id],
  }),
}));

// ===================================================================
// Gift Codes & Events
// ===================================================================
export const giftCodesRelations = relations(giftCodes, ({ many }) => ({
  redemptionLogs: many(redemptionLogs),
}));

export const eventSchedulesRelations = relations(eventSchedules, ({ many }) => ({
  eventParticipationLogs: many(eventParticipationLogs),
}));

// ===================================================================
// Auth Tokens
// ===================================================================
export const refreshTokensRelations = relations(refreshTokens, ({ one }) => ({
  user: one(users, {
    fields: [refreshTokens.userId],
    references: [users.id],
  }),
}));

export const passwordResetTokensRelations = relations(passwordResetTokens, ({ one }) => ({
  user: one(users, {
    fields: [passwordResetTokens.userId],
    references: [users.id],
  }),
}));

export const emailChangeTokensRelations = relations(emailChangeTokens, ({ one }) => ({
  user: one(users, {
    fields: [emailChangeTokens.userId],
    references: [users.id],
  }),
}));

// ===================================================================
// Email
// ===================================================================
export const emailQueueRelations = relations(emailQueue, ({ one }) => ({
  user: one(users, {
    fields: [emailQueue.userId],
    references: [users.id],
  }),
  emailTemplate: one(emailTemplates, {
    fields: [emailQueue.templateId],
    references: [emailTemplates.id],
  }),
}));

export const emailTemplatesRelations = relations(emailTemplates, ({ many }) => ({
  emailQueue: many(emailQueue),
}));
