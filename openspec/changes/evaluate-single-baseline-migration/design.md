## Overview

本设计将数据库迁移策略收敛为**单基线（single baseline）**：
- 仅保留 `drizzle/0000_zippy_blink.sql` 作为默认可执行迁移入口。
- 固定迁移执行器为 **Wrangler-only**（`wrangler d1 migrations apply` 语义）。
- 通过显式规范替代，处理与已完成变更 `enforce-automata-prefix-0000-sql` 中“存量环境必须前向迁移”的冲突。
- 将校验门禁从“表名前缀 + 表集合”升级为“结构全等（列/类型/默认值/索引/FK）”。

## Fixed Decisions (No-TBD)

### 1) Migration Runner（冻结）

- 仅允许 Wrangler SQL 迁移链路。
- 禁止在生产/发布链路使用 Drizzle runtime migrator 作为执行入口。
- `drizzle/meta/_journal.json` 仅作为工具元数据，不作为运行时真值。

### 2) Migration Asset Strategy（冻结）

- 目标策略：**立即单基线**。
- 默认执行入口固定为：`drizzle/0000_zippy_blink.sql`。
- 默认执行排除清单：
  - `drizzle/0001_prefix_page_permissions_api_path.sql`
  - `drizzle/0002_rename_cron_task_tables_for_existing_dbs.sql`
  - `drizzle/rollback/**`

### 3) Activation Preconditions（冻结）

单基线策略生效前必须具备以下可审计证据：
1. 目标环境清单（环境名、数据库标识、状态）。
2. 迁移执行记录为空或仅初始化记录。
3. 变更审批记录明确 `greenfield-only`。

若上述任一证据不满足，本策略不得生效。

### 4) Failure Fallback（冻结）

出现任一情况时，本策略立即失效：
- 存在历史环境迁移执行记录；
- 出现混合状态数据库（非纯新库）。

失效后必须：
1. 停止单基线实施；
2. 新建“兼容迁移”变更；
3. 在新变更中定义存量迁移链路，不得直接复用本变更策略。

### 5) Spec Consistency（冻结）

- 当前变更显式 supersede `enforce-automata-prefix-0000-sql` 中“已存在环境必须新增前向迁移”的约束。
- 禁止在仓库中同时保留“仅单基线”与“必须前向迁移”两套互斥规则。

### 6) Contract Validation Gate（冻结）

校验必须覆盖三层结构全等：
1. `drizzle/0000_zippy_blink.sql`
2. `packages/shared/src/db/schema/*.ts`
3. `drizzle/meta/0000_snapshot.json`

检查维度至少包含：
- 表集合
- 列集合与列类型
- 默认值
- 外键目标与动作
- 索引与唯一约束

失败分级与处置规则（3.3）冻结如下：
- `blocker`（阻断）：
  - 任一结构全等维度失败（表/列/类型/默认值/索引/FK）；
  - 输入工件缺失、格式错误或不可解析；
  - 同一输入下输出不确定（非 deterministic）。
- `warning`（告警）：
  - 不影响结构全等结论的卫生类问题（如命名建议、可读性提示）。
- 处置：
  - 存在任一 `blocker` 时，必须阻断实现/发布链路；
  - 仅存在 `warning` 时可继续，但必须写入审计记录。

### 7) Structured Output Contract（冻结）

校验报告输出必须满足固定 JSON 结构：
- 顶层字段固定：`ok`、`summary`、`artifacts`、`checks`。
- `checks` 数组每项固定字段：`id`、`severity`、`ok`、`evidence`、`diff`、`recommendation`。
- 排序规则固定：
  - `checks` 按 `id` 字典序排序；
  - `evidence` 与 `diff` 内部条目按稳定字典序排序；
  - 相同输入与相同 commit 下重复执行，输出字节级一致。

## Implementation Architecture

### A. Single Baseline Contract

- 以 `drizzle/0000_zippy_blink.sql` 为默认迁移源。
- 所有当前有效 schema 语义必须体现在 `0000` 与 `snapshot/schema` 三层中。

### B. Runner Boundary Contract

- 迁移执行命令唯一化到 Wrangler。
- 执行目录仅允许默认前向清单（不包含 rollback 目录）。
- 禁止“扫描所有 .sql（含 rollback）”的不受控执行模式。

### C. Structural Equality Validation

在现有 `validate-automata-prefix` 基础上升级：
- 从“名称/集合检查”扩展为“结构化对比报告”，覆盖表/列/类型/默认值/索引/FK。
- 报告按固定 JSON 契约输出（`ok/summary/artifacts/checks`），并包含分级字段（`blocker|warning`）。
- 输出稳定排序（deterministic），可作为 CI gate。

### D. Supersede Protocol

- 在本变更 proposal/spec 中明确 supersede 关系与生效边界：
  - 生效条件：`greenfield-only` 且证据完备；
  - 失效条件：出现历史环境或混合状态；
  - 失效处理：必须改走新建兼容迁移变更。

### E. Property-Based Constraint Mapping

将 Phase 4 的五类性质映射为可执行校验契约：

1. **Runner Uniqueness（4.1）**
   - Invariant：发布配置中迁移执行器只能是 Wrangler。
   - Falsification：注入同时启用 Wrangler 与 Drizzle runtime migrator 的配置。
   - Expected：产出 `blocker` 并阻断流程。

2. **Bootstrap Lane Exclusivity（4.2）**
   - Invariant：默认 bootstrap 仅执行 `drizzle/0000_zippy_blink.sql`。
   - Falsification：向默认执行清单注入 `0001`/`0002`/`rollback` 任一项。
   - Expected：产出 `blocker` 并阻断流程。

3. **Structural Equality Across Artifacts（4.3）**
   - Invariant：SQL / schema / snapshot 在表/列/类型/默认值/索引/FK 维度全等。
   - Falsification：随机变异任一结构字段（如列类型、默认值、索引或 FK 目标）。
   - Expected：产出 `blocker` 并阻断流程。

4. **Deterministic Validation（4.4）**
   - Invariant：相同输入与 commit 下，输出结构、排序与结论一致。
   - Falsification：多次执行并扰动输入枚举顺序，比较输出字节级一致性。
   - Expected：若不一致，产出 `blocker` 并阻断流程。

5. **Supersede Consistency（4.5）**
   - Invariant：单基线生效时，不存在并行生效的“存量必须前向迁移”规则。
   - Falsification：同时标记两类互斥规则为有效约束。
   - Expected：产出 `blocker` 并阻断流程。

## Risks & Mitigation

1. **历史环境误判风险（高）**
   - 缓解：实施前必须满足 Activation Preconditions 证据。
2. **结构漂移风险（高）**
   - 缓解：结构全等校验必须通过后才能进入实现。
3. **执行器分叉风险（高）**
   - 缓解：固定 Wrangler-only，并在脚本/文档中显式约束。
4. **回滚能力下降风险（中）**
   - 缓解：通过“失效回退条件 + 新建兼容变更”恢复存量支持，而非混入默认链路。

## Definition of Ready for Implementation

满足以下条件才进入下一实施阶段：
- Runner 策略已冻结为 Wrangler-only。
- 默认执行清单与排除清单已冻结。
- 生效前提证据要求与失效回退条件已冻结。
- supersede 约束已明确且跨 proposal/design/spec 一致。
- tasks.md 对应步骤已勾选。