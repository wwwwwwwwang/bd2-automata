## Why

当前项目中存在 `packages/shared/src/utils/snowflake.ts` 文件，实现了 Snowflake ID 生成器。经过代码库搜索确认，该文件仅在文档中被引用（`.bd2/phase1-tasks.md`、`.bd2/spec-plan.md`、`openspec/changes/implement-api-crud-fullstack/proposal.md`），但在实际代码中没有任何导入或使用。

根据 `implement-api-crud-fullstack` 变更的原始设计，项目计划采用"后端雪花算法生成 BIGINT（64位）ID"策略，但该策略尚未在实际代码中落地。保留未使用的 Snowflake 实现会造成代码库混乱，增加维护负担。

## What Changes

- 删除 `packages/shared/src/utils/snowflake.ts` 文件（未被任何代码引用）
- 更新相关文档，移除对 Snowflake ID 生成器的引用或标注其为"待实施"状态
- 确保删除操作不影响现有功能（因为该文件未被使用）

## Capabilities

### Modified Capabilities
- `codebase-cleanup`: 移除未使用的 Snowflake ID 生成器实现，保持代码库整洁

### Removed Capabilities
- `snowflake-id-generator`: 移除未使用的 Snowflake ID 生成器实现（注：该能力从未在实际代码中启用）

## Impact

- 受影响文件：
  - `packages/shared/src/utils/snowflake.ts`（删除）
  - `.bd2/phase1-tasks.md`（文档更新）
  - `.bd2/spec-plan.md`（文档更新）
  - `openspec/changes/implement-api-crud-fullstack/proposal.md`（文档更新）
- 受影响系统：无（该文件未被任何代码引用）
- 风险：极低（删除未使用代码）

### Constraint Sets

#### Hard Constraints
- 必须确认 `snowflake.ts` 在代码中无任何导入引用
- 删除操作不能影响现有功能
- 相关文档需要同步更新

#### Soft Constraints
- 如果未来需要 Snowflake ID 策略，可以重新实现或从 git 历史恢复

#### Dependencies
- 无依赖

#### Risks
- 极低风险：该文件未被使用，删除不会影响现有功能

### Verifiable Success Criteria

1. `packages/shared/src/utils/snowflake.ts` 文件已删除
2. 代码库中无任何对 `snowflake.ts`、`generateSnowflakeId`、`createSnowflakeIdGenerator` 的导入引用
3. 相关文档已更新，移除或标注 Snowflake ID 相关内容
4. 所有现有测试通过（如果有）
