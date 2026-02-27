## 1. 定义枚举（shared 层）

- [x] 1.1 `packages/shared/src/enums.ts`：定义 9 组 `as const` 枚举元组 + 派生类型
  - `TASK_STATUS` / `TaskStatus`
  - `EMAIL_QUEUE_STATUS` / `EmailQueueStatus`
  - `EMAIL_TYPE` / `EmailType`
  - `LOG_STATUS` / `LogStatus`
  - `PERMISSION_TYPE` / `PermissionType`
  - `PROVIDER_TYPE` / `ProviderType`
  - `ATTENDANCE_STATUS` / `AttendanceStatus`
  - `REDEMPTION_STATUS` / `RedemptionStatus`
  - `EVENT_PARTICIPATION_STATUS` / `EventParticipationStatus`

- [x] 1.2 `packages/shared/src/index.ts`：新增 `export * from './enums'`

## 2. 重构 Drizzle Schema（shared 层，9 个文件）

- [x] 2.1 `packages/shared/src/db/schema/tasks.ts`：`status` enum → `TASK_STATUS`
- [x] 2.2 `packages/shared/src/db/schema/email-queue.ts`：`emailType` enum → `EMAIL_TYPE`，`status` enum → `EMAIL_QUEUE_STATUS`
- [x] 2.3 `packages/shared/src/db/schema/logs.ts`：`status` enum → `LOG_STATUS`
- [x] 2.4 `packages/shared/src/db/schema/permissions.ts`：`type` enum → `PERMISSION_TYPE`
- [x] 2.5 `packages/shared/src/db/schema/game-accounts.ts`：`providerType` enum → `PROVIDER_TYPE`
- [x] 2.6 `packages/shared/src/db/schema/daily-attendance-logs.ts`：`status` enum → `ATTENDANCE_STATUS`
- [x] 2.7 `packages/shared/src/db/schema/weekly-attendance-logs.ts`：`status` enum → `ATTENDANCE_STATUS`
- [x] 2.8 `packages/shared/src/db/schema/redemption-logs.ts`：`status` enum → `REDEMPTION_STATUS`
- [x] 2.9 `packages/shared/src/db/schema/event-participation-logs.ts`：`status` enum → `EVENT_PARTICIPATION_STATUS`

## 3. 重构 Zod Schema（shared 层，4 个文件）

- [x] 3.1 `packages/shared/src/schemas/tasks.schema.ts`：`z.enum()` → `z.enum(TASK_STATUS)`
- [x] 3.2 `packages/shared/src/schemas/email-queue.schema.ts`：`z.enum()` → `z.enum(EMAIL_TYPE)`
- [x] 3.3 `packages/shared/src/schemas/permissions.schema.ts`：`z.enum()` → `z.enum(PERMISSION_TYPE)`
- [x] 3.4 `packages/shared/src/schemas/game-accounts.schema.ts`：`z.enum()` → `z.enum(PROVIDER_TYPE)`

## 4. 重构 API 服务层

- [x] 4.1 `packages/api/src/utils/email.ts`：删除本地 `type EmailType`，改为 `import { EmailType } from '@bd2-automata/shared'`

## 5. 验证

- [x] 5.1 grep 确认：Drizzle schema 无内联 enum 字符串数组
- [x] 5.2 grep 确认：Zod schema 无内联 z.enum 字符串数组
- [x] 5.3 grep 确认：API 层无本地 EmailType 定义
- [x] 5.4 wrangler dry-run 无新增编译错误
