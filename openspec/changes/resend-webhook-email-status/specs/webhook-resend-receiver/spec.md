## webhook-resend-receiver

### Requirements

#### REQ-1: Webhook 端点接收并验证 Resend 事件

- 端点：`POST /api/webhooks/resend`
- 使用 `resend.webhooks.verify()` 验证签名
- 签名无效 → 返回 HTTP 400
- 签名有效 → 解析事件类型和 `data.email_id`

**Scenario**: 有效签名的 delivered 事件
- Given: Resend 发送 `email.delivered` 事件，签名有效
- When: Webhook 端点接收请求
- Then: 对应 `email_queue` 记录 status 更新为 `delivered`，返回 HTTP 200

**Scenario**: 无效签名
- Given: 请求缺少或伪造 `svix-signature` header
- When: Webhook 端点接收请求
- Then: 返回 HTTP 400，数据库无任何变更

#### REQ-2: 状态单向更新（不可回退）

- 状态优先级：`pending(0) < sent(1) < delivered/bounced/complained/failed(2)`
- 仅当新状态优先级 > 当前状态优先级时才执行更新

**Scenario**: delivered 不被 sent 覆盖
- Given: `email_queue` 记录 status 为 `delivered`
- When: 收到该邮件的 `email.sent` 事件
- Then: status 保持 `delivered`，不变更

#### REQ-3: 幂等处理

- 同一事件重复投递不会导致重复状态变更或统计重复计数
- `resendEmailId` 不存在于 `email_queue` 中 → 返回 200，不报错

**Scenario**: 重复 delivered 事件
- Given: `email_queue` 记录 status 已为 `delivered`
- When: 再次收到相同的 `email.delivered` 事件
- Then: 无数据库写入，返回 HTTP 200

**Scenario**: 未知 email_id
- Given: Webhook 携带的 `email_id` 在 `email_queue` 中不存在
- When: Webhook 端点接收请求
- Then: 返回 HTTP 200，无数据库变更

#### REQ-4: 统计更新

- 状态实际变更时，更新 `email_stats` 对应日期的统计字段
- `delivered` → `totalDelivered` +1
- `bounced` → `totalBounced` +1
- `complained` → `totalComplained` +1

### PBT Properties

#### PROP-1: 状态单调性
- **Invariant**: 邮件状态优先级只能单调递增，不可递减
- **Falsification**: 对任意事件序列，验证最终状态优先级 >= 初始状态优先级

#### PROP-2: 幂等性
- **Invariant**: 对同一事件重复处理 N 次，数据库状态与处理 1 次完全一致
- **Falsification**: 发送同一 Webhook payload 2 次，比较两次后的数据库快照

#### PROP-3: 统计一致性
- **Invariant**: `emailStats` 中各状态计数之和 = 实际发生状态变更的邮件数
- **Falsification**: 重放事件序列后，验证统计数与实际变更记录数一致
