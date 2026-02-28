## ADDED Requirements

### Requirement: 全域主键策略统一为数据库自增整数
系统 MUST 对所有“单列 surrogate 主键 + integer 类型”实体采用统一策略：ID 由数据库生成，应用层禁止手动赋值。

#### Scenario: 统一主键声明
- **GIVEN** 开发者在 shared schema 中定义单列整数主键表
- **WHEN** 声明 `id` 字段
- **THEN** 必须使用统一写法 `integer('id', { mode: 'number' }).primaryKey()`
- **AND** 不允许在同一变更中出现与该写法语义冲突的替代声明

#### Scenario: 目标表范围确定
- **GIVEN** 变更 `ensure-autoincrement-ids`
- **WHEN** 审核改动覆盖范围
- **THEN** 必须仅包含“单列 integer surrogate PK”表
- **AND** 明确排除 text/composite PK 表（如 `task_queue`、`automata_distributed_locks`、`cron_configs`）

#### Scenario: 应用层插入行为
- **GIVEN** 业务服务执行 insert
- **WHEN** 插入目标为 integer 主键表
- **THEN** insert payload 中不得出现主键 `id` 字段
- **AND** 主键值由数据库自动分配

### Requirement: 禁止 Snowflake 与手工主键写入
系统 MUST 移除并持续禁止 Snowflake 主键生成路径及手工主键赋值路径。

#### Scenario: 注册流程禁止手工主键
- **GIVEN** 用户注册调用 `registerUser`
- **WHEN** 写入 `users` 表
- **THEN** 不得包含 `id: generateSnowflakeId()` 或任何等价手动赋值

#### Scenario: 静态门禁
- **GIVEN** CI 执行静态扫描
- **WHEN** 发现 `generateSnowflakeId` 引入/调用，或 insert 对主键 `id` 手工赋值
- **THEN** 流水线必须失败并阻断合入

### Requirement: 数值安全边界约束
系统 MUST 以 JavaScript 安全整数边界作为运行时兼容约束。

#### Scenario: parseId 安全边界
- **GIVEN** API 路由参数传入字符串 ID
- **WHEN** 经过 `parseId` 解析
- **THEN** 仅当值满足 `Number.isSafeInteger` 且 `<= Number.MAX_SAFE_INTEGER` 时通过
- **AND** 超界值必须返回 400 参数错误

#### Scenario: 预检超界阻断
- **GIVEN** 发布前执行数据库预检
- **WHEN** 任一 integer 主键表存在 `id > Number.MAX_SAFE_INTEGER`
- **THEN** 本次“number 路径”发布必须中止
- **AND** 先完成数据治理与策略评审，再启动后续变更

### Requirement: 外键完整性硬门禁
系统 MUST 在变更前后通过完整外键一致性校验。

#### Scenario: 迁移前完整性校验
- **GIVEN** 生产发布前
- **WHEN** 执行 `PRAGMA foreign_key_check`
- **THEN** 结果必须为 0 行
- **AND** 否则阻断发布

#### Scenario: 迁移后完整性校验
- **GIVEN** 发布完成
- **WHEN** 执行 `PRAGMA foreign_key_check`
- **THEN** 结果必须为 0 行
- **AND** 任一 orphan/type mismatch 触发回滚流程

### Requirement: 运行可观测与回滚门禁
系统 MUST 提供最小可观测指标与明确回滚触发条件。

#### Scenario: 观测窗口
- **GIVEN** 发布完成
- **WHEN** 进入观察期
- **THEN** 必须监控注册失败率、insert 失败率、PK/FK 约束错误数
- **AND** 任一核心指标超过阈值时触发预定义回滚

## ADDED Property-Based Test Properties

### Property: Monotonicity
**INVARIANT:** 对每个 integer PK 表，所有“不传 id 的成功提交插入”按提交顺序满足严格递增：`id[n+1] > id[n]`。

**FALSIFICATION:** 生成随机操作序列（insert/delete/rollback/restart），提取成功提交 ID 序列，若出现非递增相邻对则失败。

### Property: Uniqueness
**INVARIANT:** 任一表内主键唯一：`COUNT(*) == COUNT(DISTINCT id)`。

**FALSIFICATION:** 并发高压写入后执行 `GROUP BY id HAVING COUNT(*) > 1`，返回任意记录即反例。

### Property: Type Safety
**INVARIANT:** 所有系统产生/接受的 ID 满足 `Number.isSafeInteger(id)` 且 `id <= Number.MAX_SAFE_INTEGER`。

**FALSIFICATION:** 用边界值（`MAX_SAFE_INTEGER±1`）、超长数字串、小数、科学计数等 fuzz 所有 parse/insert/read 路径，若超界被接受或合法值被错误拒绝则失败。

### Property: Referential Integrity
**INVARIANT:** 任一 child 表非空 FK 在提交时都能映射到 parent，或满足 FK 动作语义（CASCADE/SET NULL）。

**FALSIFICATION:** 随机化 parent/child 增删改顺序并注入孤儿写入，若孤儿写入成功或迁移后残留 orphan 即失败。

### Property: Idempotency (No ID Reuse)
**INVARIANT:** 相同 payload 重复插入时，每次成功插入都获得新 ID，不复用历史已提交 ID。

**FALSIFICATION:** 重复插入→删除部分/全部→再次插入，若新 ID 与历史集合相交或 `<=` 历史最大值则失败。

### Property: Round-trip Consistency
**INVARIANT:** ID 在 DB number -> string -> parseId -> JWT payload -> JSON stringify/parse 往返后数值保持一致。

**FALSIFICATION:** 对安全整数边界集与前导零字符串做全链路往返，出现值漂移、类型漂移或误拒绝即失败。
