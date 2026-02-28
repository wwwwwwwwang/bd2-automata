## Overview

本设计将 `ensure-autoincrement-ids` 固化为“零决策执行”方案：
- 全部单列 integer surrogate 主键实体统一由数据库分配 ID。
- 应用层移除/禁止 Snowflake 与手工主键赋值。
- 以 `Number.MAX_SAFE_INTEGER` 作为运行时硬边界。
- 通过预检门禁、发布顺序、回滚机制和观测阈值降低上线风险。

## Goals

1. 统一主键策略为 DB-generated integer（应用层不写入 id）。
2. 消除 `generateSnowflakeId` 路径及未来回归风险。
3. 保持 JWT / parseId / FK 全链路 number 语义一致。
4. 建立可验证的发布门禁（预检、测试、监控、回滚）。

## Non-Goals

- 本变更不引入 bigint/string ID 架构重构。
- 不改造 text/composite PK 表主键策略。
- 不在本变更中实现分布式 ID 策略。

## Scope & Canonical Table Inventory

### In Scope (19 tables, integer single-column PK)
- automata_users
- automata_roles
- automata_permissions
- automata_game_accounts
- automata_email_queue
- automata_email_stats
- automata_email_templates
- automata_event_schedules
- automata_gift_codes
- automata_dictionaries
- automata_dictionary_items
- automata_task_logs
- automata_refresh_tokens
- automata_password_reset_tokens
- automata_email_change_tokens
- automata_daily_attendance_logs
- automata_weekly_attendance_logs
- automata_redemption_logs
- automata_event_participation_logs

### Out of Scope (non-integer-surrogate PK)
- task_queue (text UUID PK)
- automata_distributed_locks (text PK)
- cron_configs (text PK)

## Architecture Decisions (Final Constraints)

### D1 — Global PK Policy
- 对 in-scope 表统一策略：`id` 为 integer PK，ID 由数据库分配。
- 禁止混合策略（同类表中不得并存手工主键写入路径）。

### D2 — Schema Declaration Standard
- in-scope 表统一使用：
  `integer('id', { mode: 'number' }).primaryKey()`
- 代码评审门禁：出现不一致声明则拒绝。

### D3 — AUTOINCREMENT Semantics
- 本变更采用“DB 分配 ID”语义，不强制物理 DDL 改造为 `... AUTOINCREMENT`。
- 若后续业务明确要求“永不复用历史 ID”，单独立变更处理 DDL 重建与运维窗口。

### D4 — Runtime Safe-Number Boundary
- `Number.MAX_SAFE_INTEGER (2^53-1)` 为 number 路径硬边界。
- 任一预检发现超界 ID，立即中止本路径，升级为 bigint/string 方案。

### D5 — No Manual PK Assignment
- 服务层 insert payload 禁止传入主键 `id`。
- `generateSnowflakeId` 及等价能力在代码中禁止存在/调用。

### D6 — FK Integrity Hard Gate
- 发布前后均执行 `PRAGMA foreign_key_check`，必须 0 结果。
- 出现 orphan/type mismatch 即阻断或回滚。

## Preflight Gate (Blocking)

以下任一失败即阻断发布：
1. `PRAGMA foreign_key_check` 非空。
2. 任一 in-scope 表出现 `typeof(id) <> 'integer'`。
3. 任一 in-scope 表出现 `id > Number.MAX_SAFE_INTEGER`。
4. 静态扫描发现 `generateSnowflakeId` 或 insert 手工写 `id`。

## Deployment Runbook (Deterministic)

### Phase 0 — Baseline Snapshot
- 记录目标环境 `sqlite_master` 中 in-scope 表 DDL。
- 记录每表 `MAX(id)`、行数、FK 检查结果。

### Phase 1 — Application Cutover (Code First)
- 部署移除手工主键写入的应用版本。
- 部署禁止 Snowflake 的静态门禁规则。

### Phase 2 — Verification
- 执行注册/登录/refresh/JWT/parseId/FK 插入回归。
- 重跑 preflight SQL，确认未出现越界与完整性问题。

### Phase 3 — Observation Window
- 监控：注册失败率、insert 失败率、PK/FK 约束错误数、ID headroom。
- 达到阈值触发回滚（见下）。

## Rollback Policy

### Trigger Conditions
- 注册失败率连续超阈值。
- PK/FK 约束错误持续出现。
- 核心写入路径异常率超过告警阈值。

### Rollback Constraints
- 回滚版本不得重新引入 Snowflake 写入路径。
- 若需要数据恢复，仅使用已验证备份与恢复脚本。

## Testing Strategy (Release Gates)

必须全部通过：
1. 静态检查：禁止 Snowflake/手工主键赋值。
2. 关键链路 E2E：register/login/refresh/JWT/parseId。
3. FK 相关写入回归：父子表新增/删除/关联查询。
4. 数据库一致性检查：FK check + max(id) + type check。

## Observability & Alerting

### Required Metrics
- registration_failure_rate
- insert_failure_rate_by_table
- pk_fk_constraint_error_count
- id_max_headroom_ratio (= MAX(id) / Number.MAX_SAFE_INTEGER)

### Ownership
- API on-call 负责观察窗口告警处理。
- 触发阈值后按回滚策略执行并记录事件。

## Risk Register (with Mitigation)

1. **ID space jump**：历史超大 ID 拉高后续分配。
   - 缓解：发布前 max(id) 扫描；超界即中止。
2. **Schema drift**：文档与真实 DDL 不一致。
   - 缓解：sqlite_master 快照作为唯一基线。
3. **Rollback reintroduces Snowflake**：回滚版本污染 ID 策略。
   - 缓解：回滚约束禁止恢复 Snowflake 路径。
