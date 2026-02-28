## Overview

本设计将 `enforce-automata-prefix-0000-sql` 收敛为零歧义执行方案：
- 统一 `drizzle/0000_zippy_blink.sql` 的表名前缀为 `automata_`
- 固定两张表的目标名：
  - `cron_configs` -> `automata_cron_configs`
  - `task_queue` -> `automata_task_queue`
- 同步 `packages/shared/src/db/schema/*.ts` 与 `drizzle/meta/0000_snapshot.json`
- 为存量环境新增前向迁移，避免仅改基线导致环境漂移

## Fixed Decisions (No-TBD)

### 1) 命名映射（冻结）

- `cron_configs` -> `automata_cron_configs`
- `task_queue` -> `automata_task_queue`

不允许引入其他命名候选，不保留白名单例外。

### 2) 迁移策略（冻结）

- 对已存在环境：**必须新增前向迁移**处理 rename/FK 同步。
- 对基线一致性：同步修改 `0000_zippy_blink.sql` 与 `0000_snapshot.json`。
- 禁止仅改基线而不提供存量升级路径。

### 3) 一致性边界（冻结）

必须同步以下三层：
1. `drizzle/0000_zippy_blink.sql`
2. `packages/shared/src/db/schema/*.ts`
3. `drizzle/meta/0000_snapshot.json`

任意单层遗漏都判定为失败。

### 4) 外键约束同步（冻结）

涉及 `task_queue` 改名时，必须同步：
- SQL 中 `REFERENCES task_queue(...)`
- snapshot 中 `tableTo: "task_queue"`
- FK name 中包含旧表名的标识

## Implementation Architecture

### A. Baseline Contract Update

- 在 `drizzle/0000_zippy_blink.sql`：
  - `CREATE TABLE \`cron_configs\`` -> `CREATE TABLE \`automata_cron_configs\``
  - `CREATE TABLE \`task_queue\`` -> `CREATE TABLE \`automata_task_queue\``
  - 所有对 `task_queue` 的 `REFERENCES` 改为 `automata_task_queue`

### B. Shared Schema Contract Update

- 在 `packages/shared/src/db/schema/cron-configs.ts`：
  - `sqliteTable('cron_configs', ...)` -> `sqliteTable('automata_cron_configs', ...)`
- 在 `packages/shared/src/db/schema/tasks.ts`：
  - `sqliteTable('task_queue', ...)` -> `sqliteTable('automata_task_queue', ...)`

### C. Snapshot Contract Update

- 在 `drizzle/meta/0000_snapshot.json`：
  - 表 key 与 `name` 同步改名
  - 外键 `tableTo`、FK 名称同步改名

### D. Forward Migration for Existing Environments

新增一条 migration（编号按仓库当前序列递增），包含：
1. `cron_configs` -> `automata_cron_configs`
2. `task_queue` -> `automata_task_queue`
3. 如 SQLite/D1 限制导致 FK 无法原地保持，则按“建新表-拷贝数据-重建约束-切换”流程实现。

## Validation Design

### Deterministic Checks

固定校验命令（本地/CI一致）：
1. 扫描 `0000_zippy_blink.sql` 的 `CREATE TABLE` 表名
2. 扫描 `schema/*.ts` 的 `sqliteTable('...')`
3. 扫描 snapshot 表 key 与 `name`
4. 扫描残留旧名：`cron_configs`、`task_queue`

### Non-Regression Gate

- 变更不得引入接口路径语义变化
- 若存在受影响服务编译链，至少确保 shared 与 SQL 合约层校验通过

## Risks & Mitigation

1. **部分同步风险（高）**
   - 缓解：三层同步检查 + 残留字符串扫描
2. **FK 漏改风险（高）**
   - 缓解：显式校验 `REFERENCES` 与 snapshot `tableTo`
3. **存量库升级风险（高）**
   - 缓解：前向迁移脚本 + 幂等验证 + 回滚脚本

## Rollback Strategy

- 若前向迁移失败：
  1) 停止后续部署
  2) 执行回滚 migration（反向 rename 或恢复备份）
  3) 重新运行一致性校验

## Definition of Ready for Implementation

满足以下全部条件才可进入 `/ccg:spec-impl`：
- 所有命名决策已冻结（无开放问题）
- 前向迁移策略已固定
- PBT 属性已写入 spec
- tasks.md 为零决策机械执行步骤