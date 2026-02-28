# evaluate-single-baseline-migration

## Context

### 原始问题
在项目仍处于构建阶段、尚未运行数据库的前提下，是否可以将 `drizzle` 下数据库变更合并为单一基线文件 `drizzle/0000_zippy_blink.sql`。

### 已冻结决策（本变更范围内）
- 迁移执行器：**Wrangler-only**。
- 目标策略：**立即单基线（仅 0000）**。
- 规范冲突处理：**显式 supersede**（替代 `enforce-automata-prefix-0000-sql` 中冲突约束）。
- 校验门禁：从“名称/集合”升级为“结构全等（表/列/类型/默认值/索引/FK）”。

## Constraint Sets

### Hard Constraints
1. **Runner 唯一化**：数据库迁移仅允许 Wrangler 入口执行；禁止 Drizzle runtime migrator 进入生产迁移链路。
2. **默认执行清单（2.1）**：
   - Allowlist：`drizzle/0000_zippy_blink.sql`
   - Denylist：`drizzle/0001_prefix_page_permissions_api_path.sql`、`drizzle/0002_rename_cron_task_tables_for_existing_dbs.sql`、`drizzle/rollback/**`
3. **生效前提证据（2.2）**：必须有可审计证据证明“无历史环境执行迁移”，至少包含：
   - 目标环境清单（含环境名称、数据库标识、状态）；
   - 迁移执行记录为空或仅存在初始化证据；
   - 变更审批记录明确“greenfield-only”。
4. **失效回退条件（2.3）**：若出现任一历史环境/混合状态证据，本策略立即失效，必须新建兼容迁移变更（不得直接复用单基线策略）。
5. **Supersede 约束**：本变更必须显式替代 `enforce-automata-prefix-0000-sql` 中“存量环境必须新增前向迁移”规则，且定义生效边界。
6. **结构全等门禁（3.1）**：SQL / schema / snapshot 必须在表/列/类型/默认值/索引/FK 维度全等，任一结构偏差均为阻断项。
7. **结构化输出契约（3.2）**：校验输出必须为固定结构的报告，至少包含 `ok`、`summary`、`artifacts`、`checks`；`checks` 与差异列表必须稳定排序，并在同 commit/同输入下保持重复执行一致。
8. **失败分级与处置（3.3）**：校验结果必须区分 `blocker` 与 `warning`：
   - `blocker`：结构全等失败、输入工件缺失/不可解析、输出非确定性；
   - `warning`：非契约型卫生问题（如命名建议）；
   - 处置规则：存在任一 `blocker` 必须阻断后续实施；仅 `warning` 时允许继续但必须记录审计。

### Soft Constraints
1. 保持变更范围聚焦在迁移策略与验证门禁，不混入接口语义重构。
2. 输出应可被 `/ccg:spec-impl` 机械执行，避免 implementation 阶段二次决策。
3. 报告字段与排序规则保持稳定，避免 CI 解析漂移。

### Dependencies
1. 依赖已完成变更 `enforce-automata-prefix-0000-sql` 的 supersede 处理。
2. 依赖 `drizzle` 目录迁移资产清单与默认执行链路定义。
3. 依赖结构全等校验实现作为交付闸门。
4. 依赖 Phase 4 的 PBT 映射可被脚本化执行（4.1~4.5 全部具备 invariant 与 falsification strategy）。

### Risks
1. **规范冲突风险（高）**：未做 supersede 会导致互斥规范并存。
2. **执行歧义风险（高）**：Runner 非唯一将导致环境行为分叉。
3. **结构漂移风险（高）**：名称/集合通过但结构不一致，仍可能运行失败。
4. **历史环境误判风险（高）**：误按单基线执行可能造成不可恢复漂移。

## Answer (Constraint-based)

在“项目尚未运行数据库”的前提下，允许采用**立即单基线（仅 0000）**。该策略必须同时满足：
- Runner 固定为 Wrangler-only；
- 默认执行清单只包含 `0000`；
- 存在 greenfield-only 可审计证据；
- 对旧规范冲突做显式 supersede；
- 结构全等门禁通过。

## Verifiable Success Criteria

1. 迁移策略文档中无 Runner 歧义：仅保留 Wrangler-only。
2. 默认执行清单与排除清单明确、可脚本化检查。
3. 生效前提证据要求可审计，失效回退条件可判定。
4. supersede 关系在 proposal/design/spec 中一致可追溯。
5. `openspec status --change "evaluate-single-baseline-migration" --json` 显示 artifacts 完整。

## Open Questions (Resolved)

1. 迁移执行器：Wrangler-only（已定）。
2. 目标策略：立即单基线（已定）。
3. 规范冲突处理：显式 supersede（已定）。
4. 校验策略：升级为结构全等（已定）。
