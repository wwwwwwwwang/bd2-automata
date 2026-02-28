## ADDED Requirements

### Requirement: 迁移执行器必须唯一化为 Wrangler-only
系统 MUST 仅允许 Wrangler 作为数据库迁移执行器。

#### Scenario: 唯一执行链路
- **GIVEN** 仓库存在 SQL 迁移资产
- **WHEN** 执行数据库迁移
- **THEN** 仅允许 Wrangler 入口执行迁移
- **AND** 不得使用 Drizzle runtime migrator 作为生产执行路径

### Requirement: 迁移策略收敛为单基线 0000
系统 MUST 将默认可执行迁移收敛为 `drizzle/0000_zippy_blink.sql`。

#### Scenario: 单基线生效
- **GIVEN** 项目处于 build 阶段且无历史环境迁移记录
- **WHEN** 执行默认迁移流程
- **THEN** 仅以 `0000_zippy_blink.sql` 作为前向迁移入口
- **AND** `0001`/`0002`/`rollback` 不进入默认执行链路

### Requirement: 规范冲突必须通过 supersede 显式消解
系统 MUST 显式替代变更 `enforce-automata-prefix-0000-sql` 中与单基线策略冲突的“存量环境必须前向迁移”约束。

#### Scenario: 冲突约束消解
- **GIVEN** 变更 `enforce-automata-prefix-0000-sql` 包含“存量环境必须前向迁移”规则
- **WHEN** 本变更冻结为“立即单基线”
- **THEN** 本变更必须声明对该冲突约束的 supersede 范围与生效条件
- **AND** 仓库中不得同时保留互斥规则作为并行有效约束

### Requirement: 三层契约校验必须升级为结构全等
系统 MUST 校验 SQL / schema / snapshot 的结构全等，而非仅名称全等。

#### Scenario: 结构全等校验通过
- **GIVEN** 三个来源：`0000_zippy_blink.sql`、`schema/*.ts`、`0000_snapshot.json`
- **WHEN** 执行校验
- **THEN** 表/列/类型/默认值/索引/FK 均全等
- **AND** 任一维度偏差都判定为 `blocker`

### Requirement: 校验输出必须结构化且可重复
系统 MUST 以固定结构输出校验报告，并保证稳定排序。

#### Scenario: 报告结构固定
- **GIVEN** 相同输入工件
- **WHEN** 运行校验脚本
- **THEN** 输出包含固定顶层字段：`ok`、`summary`、`artifacts`、`checks`
- **AND** 每个 check 包含：`id`、`severity`、`ok`、`evidence`、`diff`、`recommendation`

### Requirement: 校验失败必须分级并绑定处置规则
系统 MUST 将失败分为 `blocker` 与 `warning` 并执行对应处置。

#### Scenario: 阻断项处置
- **GIVEN** 校验结果存在任一 `blocker`
- **WHEN** 进入实现或发布链路
- **THEN** 流程必须被阻断
- **AND** 不得在未修复 blocker 的情况下继续

#### Scenario: 告警项处置
- **GIVEN** 校验结果仅包含 `warning`
- **WHEN** 进入后续流程
- **THEN** 流程可继续
- **AND** 必须记录 warning 审计条目

## ADDED Property-Based Test Properties

### Property: Runner Uniqueness
**INVARIANT:** 任一发布配置仅对应一个迁移执行器（Wrangler-only）。

**FALSIFICATION STRATEGY:** 构造同时启用 Wrangler 与 Drizzle runtime migrator 的配置，校验必须失败。

### Property: Bootstrap Lane Exclusivity
**INVARIANT:** 默认 bootstrap 流程仅执行 `0000_zippy_blink.sql`，不触发 `0001`/`0002`/rollback。

**FALSIFICATION STRATEGY:** 注入包含 `0001` 或 `0002` 的执行清单，校验必须失败。

### Property: Structural Equality Across Artifacts
**INVARIANT:** `Schema(SQL) == Schema(Drizzle TS) == Schema(Snapshot)`，其中 Schema 至少包含表/列/类型/默认值/索引/FK。

**FALSIFICATION STRATEGY:** 在任一层随机修改一项结构属性（如列类型、默认值、索引或 FK 目标），校验必须产出至少一个 `blocker`。

### Property: Deterministic Validation
**INVARIANT:** 相同 commit 下重复执行校验，输出 pass/fail 与差异排序完全一致。

**FALSIFICATION STRATEGY:** 多次执行并打乱输入文件顺序；若输出在字段顺序、check 顺序、差异顺序任一处不一致则判定失败。

### Property: Failure Severity Discipline
**INVARIANT:** 结构不一致与工件不可解析问题只能被标记为 `blocker`，不得降级为 `warning`。

**FALSIFICATION STRATEGY:** 注入列类型冲突或损坏快照 JSON，若结果未产生 `blocker` 则判定失败。

### Property: Supersede Consistency
**INVARIANT:** 在“单基线生效条件”下，不存在与其并行生效的“必须前向迁移”冲突规则。

**FALSIFICATION STRATEGY:** 同时保留两类互斥规则且标记为有效，校验必须失败。