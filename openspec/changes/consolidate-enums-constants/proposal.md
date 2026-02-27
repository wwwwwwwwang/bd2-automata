## Why

项目中 `packages/shared/src/enums.ts` 和 `packages/shared/src/constants.ts` 两个文件已创建但完全为空，未被 `index.ts` 导出。与此同时，枚举值散落在多个位置：

- Drizzle schema 中 9 处 `text('...', { enum: [...] })` 内联定义字符串枚举
- Zod schema 中 4 处 `z.enum([...])` 重复定义相同枚举值
- API 服务层中 1 处本地 `type` 别名（`EmailType`）重复定义枚举值

同一枚举概念（如 TaskStatus、EmailType）在 schema、zod、service 三层各定义一次，修改时容易遗漏导致不一致。

## What Changes

- 在 `packages/shared/src/enums.ts` 中集中定义所有业务枚举的值数组（`as const` 元组），作为 Drizzle schema 和 Zod schema 的单一数据源。
- 更新 `packages/shared/src/index.ts` 导出 enums 模块。
- 重构 Drizzle schema 的 `enum:` 数组引用枚举元组。
- 重构 Zod schema 的 `z.enum()` 引用枚举元组。
- 重构 API 服务层 `EmailType` 类型别名，改为从 shared 导入。
- `constants.ts` 暂不填充（当前无真正跨包共享的常量；`EVENT_TO_STATUS`/`ALLOWED_FROM` 为 API 层实现细节，保持本地）。

## Capabilities

### New Capabilities
- `shared-enums`: 集中管理所有业务枚举值，Drizzle/Zod/Service 三层共享单一数据源。

### Modified Capabilities
- 所有 Drizzle schema 的 `enum:` 数组改为引用 shared 枚举。
- 所有 Zod schema 的 `z.enum()` 改为引用 shared 枚举。
- API 服务层的 `EmailType` 类型别名改为从 shared 导入。

## Impact

- 受影响文件（shared 层）：
  - `packages/shared/src/enums.ts` — 填充所有业务枚举定义
  - `packages/shared/src/index.ts` — 新增导出
  - `packages/shared/src/db/schema/tasks.ts` — 引用枚举
  - `packages/shared/src/db/schema/email-queue.ts` — 引用枚举
  - `packages/shared/src/db/schema/logs.ts` — 引用枚举
  - `packages/shared/src/db/schema/permissions.ts` — 引用枚举
  - `packages/shared/src/db/schema/game-accounts.ts` — 引用枚举
  - `packages/shared/src/db/schema/daily-attendance-logs.ts` — 引用枚举
  - `packages/shared/src/db/schema/weekly-attendance-logs.ts` — 引用枚举
  - `packages/shared/src/db/schema/redemption-logs.ts` — 引用枚举
  - `packages/shared/src/db/schema/event-participation-logs.ts` — 引用枚举
  - `packages/shared/src/schemas/tasks.schema.ts` — 引用枚举
  - `packages/shared/src/schemas/email-queue.schema.ts` — 引用枚举
  - `packages/shared/src/schemas/permissions.schema.ts` — 引用枚举
  - `packages/shared/src/schemas/game-accounts.schema.ts` — 引用枚举
- 受影响文件（API 层）：
  - `packages/api/src/utils/email.ts` — 删除本地 EmailType，改为从 shared 导入
- 不涉及：
  - `packages/api/src/services/webhookService.ts` — EVENT_TO_STATUS / ALLOWED_FROM 为 API 层实现细节，保持本地
  - `packages/web/src/enums/` — UI 层专用枚举，不在本次范围内
  - `packages/shared/src/constants.ts` — 暂无跨包常量需填充
- 风险：
  - 纯重构，不改变运行时行为
  - Drizzle schema 的 `enum:` 参数需要 `as const` 元组类型才能正确推断
  - 无数据库迁移

## Constraints

- 命名规范：SCREAMING_CASE 数组（`TASK_STATUS`）+ PascalCase 类型（`TaskStatus`）
- 枚举值数组必须用 `as const` 声明，确保 Drizzle `text({ enum: ... })` 和 `z.enum()` 的类型推断正确
- 不修改任何数据库列名或默认值，纯代码层重构
- 不涉及 `packages/web` 的枚举（UI 层枚举与业务枚举职责不同）
- API 层实现细节常量（EVENT_TO_STATUS、ALLOWED_FROM）保持本地，不迁移到 shared
- 不新增任何运行时依赖
- 单一 enums.ts 文件，不拆分子文件（当前仅 9 组，不需要）

## Success Criteria

1. `packages/shared/src/enums.ts` 包含所有 9 组业务枚举的 `as const` 元组 + 派生类型
2. 所有 Drizzle schema 的 `enum:` 数组引用 shared 枚举，无内联字符串数组
3. 所有 Zod schema 的 `z.enum()` 引用 shared 枚举，无内联字符串数组
4. API 层 `EmailType` 从 shared 导入，无本地重复定义
5. `packages/shared/src/index.ts` 导出 enums
6. 所有现有功能行为不变（纯重构）
