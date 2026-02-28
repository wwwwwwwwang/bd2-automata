## 1. 冻结决策与边界

- [x] 1.1 冻结迁移执行器为 Wrangler-only，并在 proposal/design/spec 中保持一致表述。
- [x] 1.2 冻结目标策略为“立即单基线（仅 0000）”，并明确默认执行链路不包含 `0001/0002/rollback`。
- [x] 1.3 明确 supersede 关系：替代旧变更中与“单基线”冲突的“必须前向迁移”约束。

## 2. 迁移资产收敛方案设计（不实施代码）

- [x] 2.1 列出默认迁移执行清单（仅 `drizzle/0000_zippy_blink.sql`）与排除清单（`0001/0002/rollback`）。
- [x] 2.2 定义“生效前提”证据要求：无历史环境执行迁移的可审计证明。
- [x] 2.3 定义“失效回退条件”：若出现历史环境，需新建兼容迁移变更而非直接复用单基线策略。

## 3. 结构全等校验门禁设计

- [x] 3.1 将校验维度从“名称/集合”升级为“表/列/类型/默认值/索引/FK”全等。
- [x] 3.2 固定结构化校验输出格式与稳定排序规则（deterministic output）。
- [x] 3.3 定义失败分级（阻断项/警告项）及对应处置规则。

## 4. PBT 约束映射

- [x] 4.1 定义 `Runner Uniqueness` 性质：双执行器并存必须失败。
- [x] 4.2 定义 `Bootstrap Lane Exclusivity` 性质：默认执行链路出现 `0001/0002/rollback` 必须失败。
- [x] 4.3 定义 `Structural Equality Across Artifacts` 性质：任一结构属性偏差必须失败。
- [x] 4.4 定义 `Deterministic Validation` 性质：重复执行输出一致。
- [x] 4.5 定义 `Supersede Consistency` 性质：互斥规范并存必须失败。

## 5. 交付闸门

- [x] 5.1 `openspec status --change "evaluate-single-baseline-migration" --json` 中 artifacts 完整（proposal/design/specs/tasks）。
- [x] 5.2 零歧义审计通过：无未决技术选择、无 implementation 阶段 TBD。
- [x] 5.3 用户显式批准冻结决策后，方可进入 `/ccg:spec-impl`。