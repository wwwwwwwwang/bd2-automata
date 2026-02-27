## 1. Schema 变更（shared 层）

- [x] 1.1 `packages/shared/src/db/schema/email-queue.ts`：status 枚举扩展为 `pending / sent / delivered / bounced / complained / failed`
- [x] 1.2 `packages/shared/src/db/schema/email-queue.ts`：新增 `resendEmailId` 字段（`text('resend_email_id')`，可空）
- [x] 1.3 `packages/shared/src/db/schema/email-stats.ts`：新增 `totalDelivered` / `totalBounced` / `totalComplained` 字段（`integer`，默认 0）
- [x] 1.4 编写 D1 迁移 SQL：`ALTER TABLE` 新增列（`resend_email_id`、`total_delivered`、`total_bounced`、`total_complained`）

## 2. 发送侧改造（存储 resendEmailId）

- [x] 2.1 `packages/api/src/services/resendService.ts`：`sendEmail` 返回值包含 `id`（Resend 的 email_id）— 已有，`data` 返回 `{ id: string }`
- [x] 2.2 `packages/api/src/services/emailQueueService.ts`：`processEmailQueue` 发送成功后将 `data.id` 写入 `email_queue.resendEmailId`

## 3. Webhook 接收端点

- [x] 3.1 `packages/api/src/index.ts`：Env 类型新增 `RESEND_WEBHOOK_SECRET`
- [x] 3.2 `packages/api/src/routes/webhooks.ts`：新建路由文件，`POST /` 接收 Webhook
  - 使用 `c.req.text()` 获取原始 body
  - 调用 `resend.webhooks.verify()` 验证签名
  - 签名无效 → 返回 400
  - 签名有效 → 调用 `handleResendWebhook(db, event)`
  - 返回 200
- [x] 3.3 `packages/api/src/index.ts`：在 auth 中间件之前注册 `app.route('/api/webhooks/resend', webhooks)`

## 4. Webhook 事件处理逻辑

- [x] 4.1 `packages/api/src/services/webhookService.ts`：新建 `handleResendWebhook` 函数
  - 定义状态优先级映射：`{ pending: 0, sent: 1, delivered: 2, bounced: 2, complained: 2, failed: 2 }`
  - 定义事件到状态映射：`{ 'email.sent': 'sent', 'email.delivered': 'delivered', ... }`
  - 通过 `resendEmailId` 查找 `email_queue` 记录
  - 未找到 → 直接返回（幂等）
  - 比较优先级：新状态优先级 <= 当前状态优先级 → 跳过
  - 更新 `email_queue.status` 和 `updatedAt`
  - 更新 `email_stats` 对应日期的统计字段（仅在状态实际变更时）

## 5. 验收

- [x] 5.1 验证：发送邮件后 `resendEmailId` 字段有值
- [x] 5.2 验证：模拟 delivered Webhook → status 变为 delivered
- [x] 5.3 验证：模拟 bounced Webhook → status 变为 bounced，统计 +1
- [x] 5.4 验证：无效签名 → 400，数据库无变更
- [x] 5.5 验证：未知 email_id → 200，数据库无变更
- [x] 5.6 验证：重复事件 → 幂等，统计不重复
- [x] 5.7 验证：delivered 后收到 sent → 状态不回退
