## 技术决策

### 枚举定义模式

使用 `as const` 元组 + `typeof` 派生联合类型：

```typescript
// SCREAMING_CASE 数组
export const TASK_STATUS = ['pending', 'in_progress', 'completed', 'failed', 'skipped'] as const;
// PascalCase 类型
export type TaskStatus = typeof TASK_STATUS[number];
```

Drizzle 消费：`text('status', { enum: TASK_STATUS })`
Zod 消费：`z.enum(TASK_STATUS)`

### 为什么不用 TypeScript enum

- Drizzle 的 `text({ enum: })` 接受 `readonly string[]`，不接受 TS enum 对象
- `as const` 元组同时满足 Drizzle、Zod、类型推断三方需求
- 无运行时开销（编译后就是普通数组）

### 文件组织

- 单一 `enums.ts`：当前 9 组枚举，约 50 行，无需拆分
- `constants.ts` 保持空文件：当前无跨包常量。`EVENT_TO_STATUS`/`ALLOWED_FROM` 为 API 层 webhook 实现细节，保持在 `webhookService.ts` 本地
- 通过 `index.ts` 的 `export * from './enums'` 统一导出

### 导入循环规避

导入方向：`enums.ts` ← `db/schema/*.ts` ← `db/schema/index.ts` ← `index.ts`

`enums.ts` 不依赖任何其他模块，位于依赖图最底层，不存在循环风险。

### 命名规范

| 类别 | 命名 | 示例 |
|------|------|------|
| 值数组 | SCREAMING_SNAKE_CASE | `EMAIL_QUEUE_STATUS` |
| 派生类型 | PascalCase | `EmailQueueStatus` |

### 9 组枚举清单

| 枚举名 | 值 | Drizzle 消费位置 | Zod 消费位置 |
|--------|-----|-----------------|-------------|
| `TASK_STATUS` | pending, in_progress, completed, failed, skipped | tasks.ts | tasks.schema.ts |
| `EMAIL_QUEUE_STATUS` | pending, sent, delivered, bounced, complained, failed | email-queue.ts | — |
| `EMAIL_TYPE` | password_reset, token_expired, system_notify | email-queue.ts | email-queue.schema.ts |
| `LOG_STATUS` | success, failure, skipped | logs.ts | — |
| `PERMISSION_TYPE` | directory, menu, button | permissions.ts | permissions.schema.ts |
| `PROVIDER_TYPE` | GOOGLE, APPLE, EMAIL | game-accounts.ts | game-accounts.schema.ts |
| `ATTENDANCE_STATUS` | success, failure, already_completed | daily-attendance-logs.ts, weekly-attendance-logs.ts | — |
| `REDEMPTION_STATUS` | success, failure, invalid_code, already_redeemed | redemption-logs.ts | — |
| `EVENT_PARTICIPATION_STATUS` | success, failure, not_active | event-participation-logs.ts | — |
