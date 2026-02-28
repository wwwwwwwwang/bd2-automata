## ADDED Requirements

### Requirement: 基线迁移文件中的业务表名必须统一为 automata_ 前缀
系统 MUST 确保 `drizzle/0000_zippy_blink.sql` 中所有 `CREATE TABLE` 的业务表名匹配 `^automata_`。

#### Scenario: 0000 基线命名全量合规
- **GIVEN** 解析 `drizzle/0000_zippy_blink.sql` 的全部 `CREATE TABLE` 语句
- **WHEN** 提取表名集合
- **THEN** 每个业务表名都必须以 `automata_` 开头

### Requirement: 非前缀历史名必须按固定映射替换
系统 MUST 使用固定命名映射，不允许变体。

#### Scenario: 固定映射执行
- **GIVEN** 历史表名 `cron_configs` 与 `task_queue`
- **WHEN** 执行本次命名规范化
- **THEN** 必须分别替换为 `automata_cron_configs` 与 `automata_task_queue`
- **AND** 不得保留白名单例外

### Requirement: SQL/Schema/Snapshot 三层命名契约必须一致
系统 MUST 保证三层产物的表名集合一致且外键目标一致。

#### Scenario: 三层集合一致
- **GIVEN** 三个来源：`0000_zippy_blink.sql`、`schema/*.ts`、`0000_snapshot.json`
- **WHEN** 提取表名集合
- **THEN** 三个集合必须全等

#### Scenario: 外键目标一致
- **GIVEN** 涉及 `task_queue` 的外键定义
- **WHEN** 完成改名
- **THEN** SQL `REFERENCES` 与 snapshot `tableTo` 必须都指向 `automata_task_queue`

### Requirement: 存量环境必须提供前向迁移路径
系统 MUST 为已存在数据库提供新增 migration 的升级路径。

#### Scenario: 前向迁移可执行
- **GIVEN** 存量环境存在 `cron_configs`/`task_queue`
- **WHEN** 执行新增 migration
- **THEN** 表结构与引用完成迁移到 `automata_cron_configs`/`automata_task_queue`
- **AND** 数据可继续被业务读写

## ADDED Property-Based Test Properties

### Property: Prefix Totality
**INVARIANT:** 对 `0000_zippy_blink.sql` 任一 `CREATE TABLE` 结果，表名满足 `^automata_[a-z0-9_]+$`。

**FALSIFICATION STRATEGY:** 随机将一个表名去前缀或替换为非前缀字符串，校验必须失败。

### Property: Legacy Name Elimination
**INVARIANT:** 在规范化后的 SQL/schema/snapshot 三层定义位置中，不出现 `cron_configs` 与 `task_queue` 作为表定义名。

**FALSIFICATION STRATEGY:** 在任一层重新注入一个旧名，校验必须失败。

### Property: Cross-Artifact Set Equality
**INVARIANT:** `Tables(SQL) == Tables(Schema) == Tables(Snapshot)`。

**FALSIFICATION STRATEGY:** 随机遗漏某层一次改名或仅改两层，集合比较必须失败。

### Property: FK Target Preservation under Rename
**INVARIANT:** 对所有引用任务队列表的外键，`tableTo/references` 在迁移后统一指向 `automata_task_queue`。

**FALSIFICATION STRATEGY:** 随机保留一个旧 FK 目标为 `task_queue`，完整性检查必须失败。

### Property: Validation Determinism
**INVARIANT:** 同一 commit 下，重复执行校验命令得到完全一致的 pass/fail 与输出排序。

**FALSIFICATION STRATEGY:** 在不同换行符/平台执行多次；若结果不一致则判定失败。