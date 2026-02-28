## 1. 冻结命名映射与迁移策略

- [x] 1.1 在 proposal/design/spec 中固定命名映射：
  - `cron_configs` -> `automata_cron_configs`
  - `task_queue` -> `automata_task_queue`
- [x] 1.2 固定迁移策略为“新增前向迁移”，移除所有“仅改基线”表述。

## 2. 基线 SQL 机械改名

- [x] 2.1 在 `drizzle/0000_zippy_blink.sql` 将 `CREATE TABLE \`cron_configs\`` 改为 `CREATE TABLE \`automata_cron_configs\``。
- [x] 2.2 在 `drizzle/0000_zippy_blink.sql` 将 `CREATE TABLE \`task_queue\`` 改为 `CREATE TABLE \`automata_task_queue\``。
- [x] 2.3 同步更新 `0000` 中所有 `REFERENCES task_queue(...)` 为 `REFERENCES automata_task_queue(...)`。

## 3. Shared Schema 机械改名

- [x] 3.1 更新 `packages/shared/src/db/schema/cron-configs.ts` 的 `sqliteTable('cron_configs', ...)` 为 `sqliteTable('automata_cron_configs', ...)`。
- [x] 3.2 更新 `packages/shared/src/db/schema/tasks.ts` 的 `sqliteTable('task_queue', ...)` 为 `sqliteTable('automata_task_queue', ...)`。

## 4. Snapshot 机械同步

- [x] 4.1 在 `drizzle/meta/0000_snapshot.json` 同步表 key/name：
  - `cron_configs` -> `automata_cron_configs`
  - `task_queue` -> `automata_task_queue`
- [x] 4.2 同步所有 FK 的 `tableTo` 与 FK name 中旧名标识。

## 5. 新增前向迁移（存量库）

- [x] 5.1 新增 migration 文件（编号递增）实现存量库表改名。
- [x] 5.2 若 SQLite/D1 约束限制 rename 直接执行，采用“建新表-拷贝数据-重建外键-切换表名”流程。
- [x] 5.3 提供可执行回滚步骤（反向迁移或备份恢复）。

## 6. 零歧义校验门禁

- [x] 6.1 增加或固化脚本化校验：`0000` 中 `CREATE TABLE` 全量匹配 `^automata_`。
- [x] 6.2 增加或固化脚本化校验：`schema/*.ts` 中 `sqliteTable('...')` 全量匹配 `^automata_`。
- [x] 6.3 增加或固化脚本化校验：snapshot 表 key/name 与 SQL/schema 集合全等。
- [x] 6.4 增加残留检查：不得出现表定义级旧名 `cron_configs`、`task_queue`。

## 7. PBT 驱动验证

- [x] 7.1 实现 `Prefix Totality` 性质测试（随机去前缀应失败）。
- [x] 7.2 实现 `Cross-Artifact Set Equality` 性质测试（任一层漏改应失败）。
- [x] 7.3 实现 `FK Target Preservation` 性质测试（旧 `task_queue` 引用残留应失败）。
- [x] 7.4 实现 `Validation Determinism` 性质测试（重复执行结果一致）。

## 8. 交付闸门

- [x] 8.1 `openspec status --change "enforce-automata-prefix-0000-sql" --json` 中 artifacts 完整（proposal/design/specs/tasks）。
- [x] 8.2 所有性质测试与脚本化校验通过后，方可进入 `/ccg:spec-impl`。
