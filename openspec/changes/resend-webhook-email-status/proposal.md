## Why

当前 `processEmailQueue` 调用 Resend API 成功后直接将邮件标记为 `sent`，但 API 请求成功仅代表 Resend 接受了投递任务，不代表邮件已送达收件人邮箱。邮件可能被退信（bounce）、标记为垃圾邮件（complained）或投递失败（failed）。缺少真实投递状态导致无法识别无效邮箱、无法统计实际送达率。

## What Changes

- 新增 Resend Webhook 接收端点，接收邮件投递生命周期事件（sent/delivered/bounced/complained/failed）。
- 扩展 `email_queue` 表 status 枚举为 `pending / sent / delivered / bounced / complained / failed`。
- 新增 `resendEmailId` 字段，存储 Resend 返回的 `email_id`，用于 Webhook 事件关联。
- 扩展 `email_stats` 表，新增 `totalDelivered` / `totalBounced` / `totalComplained` 统计字段。
- Webhook 端点使用 Resend SDK 内置签名验证（`resend.webhooks.verify()`），需新增 `RESEND_WEBHOOK_SECRET` 环境变量。

## Capabilities

### New Capabilities
- `webhook-resend-receiver`: 公开 Webhook 端点接收 Resend 邮件投递事件，验证签名后更新邮件状态。
- `email-delivery-tracking`: 邮件状态从"API 调用成功"细化为"真实投递结果"，支持 delivered/bounced/complained 区分。

### Modified Capabilities
- `email-queue-status`: status 枚举从 3 种扩展为 6 种。
- `email-stats-tracking`: 统计维度从 sent/failed 扩展为 sent/delivered/failed/bounced/complained。
- `process-email-queue`: 发送成功后存储 Resend 返回的 `email_id`。

## Impact

- 受影响文件：
  - `packages/shared/src/db/schema/email-queue.ts` — status 枚举扩展 + 新增 resendEmailId 字段
  - `packages/shared/src/db/schema/email-stats.ts` — 新增统计字段
  - `packages/api/src/index.ts` — Env 新增 RESEND_WEBHOOK_SECRET，注册 webhook 公开路由
  - `packages/api/src/routes/webhooks.ts` — 新建，Webhook 接收端点
  - `packages/api/src/services/webhookService.ts` — 新建，Webhook 事件处理逻辑
  - `packages/api/src/services/emailQueueService.ts` — processEmailQueue 存储 resendEmailId
  - `packages/api/src/services/resendService.ts` — sendEmail 返回 email_id
- 受影响系统：Cloudflare Worker API（Hono）+ D1（Drizzle）
- 新增环境变量：`RESEND_WEBHOOK_SECRET`
- 风险：
  - D1 schema 变更需要数据库迁移
  - Webhook 端点必须公开（无 Bearer token），安全性依赖签名验证
  - Resend Webhook 可能重复投递同一事件，需幂等处理

## Success Criteria

1. Resend 发送 `email.delivered` 事件 → `email_queue` 对应记录 status 更新为 `delivered`
2. Resend 发送 `email.bounced` 事件 → status 更新为 `bounced`，`emailStats.totalBounced` +1
3. Resend 发送 `email.complained` 事件 → status 更新为 `complained`，`emailStats.totalComplained` +1
4. 无效签名的 Webhook 请求 → 返回 400，不更新任何数据
5. `email_queue` 中不存在的 `resendEmailId` → 返回 200（幂等，不报错）
6. 同一事件重复投递 → 幂等处理，状态不回退（delivered 不会被覆盖为 sent）
7. `processEmailQueue` 发送成功后 → `resendEmailId` 字段存储 Resend 返回的 id
