# enforce-automata-prefix-0000-sql

## Context

### 原始需求
检查 `drizzle/0000_zippy_blink.sql` 中表名，确保都以 `automata_` 开头。

### 需求增强（结构化）
- **目标**：建立可执行、可验证的表名前缀约束，覆盖 `drizzle/0000_zippy_blink.sql`，并与 shared schema / drizzle snapshot 保持一致。
- **技术约束**：
  - 校验对象优先为基线迁移文件 `drizzle/0000_zippy_blink.sql`。
  - 约束同步到 `packages/shared/src/db/schema/*.ts` 与 `drizzle/meta/0000_snapshot.json`，避免契约漂移。
- **范围边界**：
  - In scope：`0000_zippy_blink.sql` 的 `CREATE TABLE` 表名规范；`shared schema` 与 `snapshot` 同步；为存量库提供前向迁移脚本。
  - Out of scope：不做备份 SQL 的历史命名清洗，不在本变更引入接口语义重构。
- **验收方向**：`0000` 中业务表命名均满足 `automata_` 前缀，且存量库可通过前向迁移完成同名收敛。

## Research Findings (Evidence)

### A. `drizzle/0000_zippy_blink.sql` 现状
- `CREATE TABLE` 总数：24
- 以 `automata_` 开头：22
- 不符合：2
  - `cron_configs` (`drizzle/0000_zippy_blink.sql:47`)
  - `task_queue` (`drizzle/0000_zippy_blink.sql:82`)

### B. 与 shared schema 对齐
`packages/shared/src/db/schema/*.ts` 中同样存在两处非前缀表：
- `cron_configs` (`packages/shared/src/db/schema/cron-configs.ts:4`)
- `task_queue` (`packages/shared/src/db/schema/tasks.ts:6`)

### C. 与 snapshot 对齐
`drizzle/meta/0000_snapshot.json` 与 `0000_zippy_blink.sql` 当前命名集合一致，同样包含：
- `cron_configs`
- `task_queue`

### D. 历史/系统差异（仅作为背景）
- `backup_schema_only.sql` 包含系统表 `d1_migrations`（不属于业务命名规范判定范围）。
- backup 中存在历史命名差异（如 `automata_task_queue` / `automata_redeem_logs` / `automata_event_history`），不作为本变更硬约束目标。

## Constraint Sets

### Hard Constraints
1. `drizzle/0000_zippy_blink.sql` 中所有 `CREATE TABLE` 表名必须匹配 `^automata_`。
2. 目标命名固定为：
   - `cron_configs` -> `automata_cron_configs`
   - `task_queue` -> `automata_task_queue`
3. 命名调整必须在以下位置保持一致：
   - `drizzle/0000_zippy_blink.sql`
   - `packages/shared/src/db/schema/*.ts` 对应 `sqliteTable('...')`
   - `drizzle/meta/0000_snapshot.json`
4. 与 `task_queue` 相关的外键引用必须同步更新（含 SQL `REFERENCES` 与 snapshot 的 `tableTo` / FK 名）。
5. 针对已存在环境必须提供前向迁移（新增 migration），不允许仅改基线文件。
6. 校验结果必须可脚本化复现（同一命令在本地/CI 得出一致结论）。

### Soft Constraints
1. 保持现有表语义不变，仅处理命名前缀一致性。
2. 保持 route/service 业务行为不变，不在本变更混入接口语义调整。
3. 提案、设计与任务中不得出现 TBD/implementation phase 决策留白。

### Dependencies
1. `task_queue` 为外键目标表（如日志表 `task_id` 引用），改名会影响外键定义与引用同步。
2. 若后续进入实施阶段，需要与当前进行中的数据库相关变更避免并行冲突。

### Risks
1. **一致性风险**：只改 SQL 不改 schema/snapshot 会造成生成与运行契约漂移。
2. **外键风险**：表名改动漏改 FK 引用会导致建表或约束异常。
3. **环境风险**：若直接将“基线命名变更”应用到已有数据环境，需额外迁移策略。

## Verifiable Success Criteria

1. 在 `drizzle/0000_zippy_blink.sql` 中，`CREATE TABLE` 语句表名 100% 以 `automata_` 开头。
2. 在 `packages/shared/src/db/schema/*.ts` 中，`sqliteTable('...')` 表名 100% 以 `automata_` 开头。
3. 在 `drizzle/meta/0000_snapshot.json` 中，不存在 `cron_configs`、`task_queue` 等非前缀业务表键名。
4. 全仓检索不再出现以下非前缀业务表名定义：
   - `CREATE TABLE \`cron_configs\``
   - `CREATE TABLE \`task_queue\``
   - `sqliteTable('cron_configs'`
   - `sqliteTable('task_queue'`
5. 验证命令输出可复现（示例）：
   - 对 `drizzle/0000_zippy_blink.sql` 的 `CREATE TABLE` 名称扫描
   - 对 `packages/shared/src/db/schema/*.ts` 的 `sqliteTable(...)` 扫描

## Open Questions (Resolved)

1. 目标命名已固定：
   - `cron_configs` -> `automata_cron_configs`
   - `task_queue` -> `automata_task_queue`
2. 迁移策略已固定：采用新增前向迁移，兼容存量库。

## Notes

- Prompt 增强工具调用失败（环境未配置增强器服务），本提案基于代码证据完成本地增强与约束化。