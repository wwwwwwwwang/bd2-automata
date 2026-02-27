## Overview

通过 Resend Webhook 接收邮件投递生命周期事件，将 `email_queue` 的状态从"API 调用结果"升级为"真实投递结果"。

## Goals

- 接收并验证 Resend Webhook 事件，更新邮件真实投递状态。
- 扩展邮件状态枚举，覆盖完整投递生命周期。
- 保证 Webhook 处理的幂等性和状态单向性。
- 扩展邮件统计维度，反映真实投递质量。

## Non-Goals

- 不处理行为追踪事件（email.opened / email.clicked）。
- 不引入消息队列或异步处理层。
- 不改变现有 `processEmailQueue` 的定时触发机制。

## Architecture Decisions

### 1) Webhook 端点位置

- 路由：`POST /api/webhooks/resend`
- 位置：在 CORS 中间件和 auth 中间件之外注册（Resend 服务器回调无 Bearer token）。
- 但仍需 `secureHeaders` 中间件。

### 2) 签名验证

- 方案：Resend SDK 内置 `resend.webhooks.verify()`。
- 依赖：`svix-id` / `svix-timestamp` / `svix-signature` 三个 HTTP header。
- 密钥：`RESEND_WEBHOOK_SECRET` 环境变量（从 Resend Dashboard Webhook 详情页获取）。
- 约束：必须传入原始 body string（`c.req.text()`），不能先 `JSON.parse`。

### 3) 状态机

邮件状态单向前进，不可回退。优先级定义：

| 状态 | 优先级 | 含义 |
|------|--------|------|
| pending | 0 | 等待发送 |
| sent | 1 | Resend API 接受投递 |
| delivered | 2 | 成功送达收件人邮箱 |
| bounced | 2 | 收件人邮件服务器永久拒绝 |
| complained | 2 | 收件人标记为垃圾邮件 |
| failed | 2 | 发送失败 |

规则：Webhook 事件只能将状态从低优先级推向高优先级。`delivered` 不会被后续 `sent` 事件覆盖。

### 4) 幂等性

- 通过 `resendEmailId` 关联 Webhook 事件到 `email_queue` 记录。
- 更新前检查当前状态优先级，仅当新状态优先级 > 当前状态优先级时才更新。
- `emailStats` 增量更新仅在状态实际变更时执行，避免重复计数。

### 5) 数据库迁移

- `email_queue.status`：D1 SQLite 的 `text` 类型无真正 enum 约束，应用层 Drizzle schema 扩展枚举即可，无需 ALTER。
- `email_queue.resendEmailId`：`ALTER TABLE automata_email_queue ADD COLUMN resend_email_id TEXT`。
- `email_stats` 新增字段：`ALTER TABLE automata_email_stats ADD COLUMN total_delivered INTEGER DEFAULT 0` 等。

## Data & Contract Design

### Webhook Payload 结构

```json
{
  "type": "email.delivered",
  "created_at": "2024-01-01T00:00:00.000Z",
  "data": {
    "email_id": "re_xxxxx",
    "to": ["user@example.com"],
    "subject": "Your subject",
    "created_at": "2024-01-01T00:00:00.000Z"
  }
}
```

### 事件到状态映射

| Resend 事件 | → email_queue.status |
|-------------|---------------------|
| email.sent | sent |
| email.delivered | delivered |
| email.bounced | bounced |
| email.complained | complained |
| email.failed | failed |

### 新增环境变量

| 变量名 | 用途 | 来源 |
|--------|------|------|
| RESEND_WEBHOOK_SECRET | Webhook 签名验证密钥 | Resend Dashboard → Webhooks → 详情页 |
