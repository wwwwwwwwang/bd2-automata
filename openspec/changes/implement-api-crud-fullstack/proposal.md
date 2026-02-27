## Why

当前项目需要在 `packages/api` 快速形成可联调的后端基础能力，并与 `backup_schema_only.sql` 的业务表结构对齐。现状虽有部分路由与服务实现，但接口能力、ID 规范、删除语义和日志表策略尚未统一，导致后续前端页面开发与联调存在较高不确定性。

## What Changes

- 建立后端 CRUD 统一约束：首批优先覆盖用户/角色/权限域（含关联关系），并提供统一接口形态（单条查询、分页查询、新增、修改、删除）。
- **BREAKING**：主键策略统一为「后端雪花算法生成的 BIGINT（64位）ID」，并在前端/接口契约中统一按 `string` 传输与处理。涉及路由参数、DTO、数据库字段与跨表关联的一致性调整。
- 统一删除策略为“按表区分”：核心业务表软删除，关联/中间表硬删除。
- 明确日志表策略为“只读+删除”：日志由系统运行时产生，不提供人工新增与修改接口。
- 形成“先后端接口 -> 再前端页面 -> 最后接口联调”的实施顺序与依赖约束。
- 输出可验证成功判据，作为后续设计/任务拆解与验收基线。

## Capabilities

### New Capabilities
- `api-crud-snowflake-id`: 在 API 层建立统一“后端雪花算法生成 BIGINT（64位）ID、前端按 string 处理”的约束与 CRUD 接口协议（单条、分页、新增、修改、删除）。
- `api-domain-user-role-permission`: 落地用户/角色/权限及其关联关系的首批后端接口能力。
- `api-log-read-delete`: 为日志类资源提供只读查询与删除能力，并限制为系统写入来源。
- `api-delete-strategy-by-table`: 定义并实施“按表区分”的删除语义（软删/硬删）及查询默认行为。
- `frontend-api-contract-integration`: 在后端接口稳定后，前端按统一契约接入并完成联调。

### Modified Capabilities
- （暂无）

## Impact

- 受影响目录：
  - `packages/api/src/routes/**`
  - `packages/api/src/services/**`
  - `packages/shared/src/db/schema/**`
  - `packages/shared/src/**/*.schema.ts`
  - `packages/web/src/api/**`（后续联调阶段）
- 受影响系统：Cloudflare Worker API（Hono）+ D1（Drizzle）+ Web 前端调用层。
- 关键约束来源：
  - API 分层与现有路由约定：`packages/api/src/routes/users.ts:1`、`packages/api/src/services/userService.ts:1`
  - D1/Drizzle 数据访问：`packages/api/src/services/taskService.ts:1`、`packages/api/src/db/drizzle.ts:1`
  - 共享 schema 聚合：`packages/shared/src/db/schema/index.ts:1`
  - SQL 基线结构：`backup_schema_only.sql:1`
- 风险与约束：
  - ID 统一策略升级为 BIGINT（64位）主键 + 后端雪花生成 + 前端 string 传输后，历史 number/string ID 路径需集中收敛。
  - 软删/硬删并存需明确每张表归属与默认查询过滤规则。
  - 日志表只读+删除策略需与系统运行写入链路保持一致，避免人工写入污染审计数据。

### Constraint Sets（供后续 design/specs 使用）

#### Hard Constraints
- 全域主键策略统一为 BIGINT（64位），由后端使用雪花算法生成；前端及 API 契约统一按 string 传输与处理 ID。
- 首批资源优先用户/角色/权限域，必须先完成后端接口。
- 日志类表仅支持查询与删除，不支持新增/修改。
- 删除语义采用“按表区分”，不能一刀切。
- 后端实现需与 `backup_schema_only.sql` 的表/关系约束保持一致。

#### Soft Constraints
- 延续当前 route -> service -> drizzle(shared schema) 的分层模式。
- 统一分页与响应契约，减少前端页面二次映射。
- 优先复用 shared 中既有 zod 校验与 schema 导出模式。

#### Dependencies
1. 先确认 shared schema 与 SQL 对齐（字段、外键、唯一约束、删除策略字段）。
2. 再实现 API 路由与服务（首批 5+ 接口）。
3. 后续再接入前端页面与联调。

#### Risks
- 历史 ID 类型漂移导致查询/关联失败。
- 软删与硬删边界不清导致数据一致性和审计问题。
- 日志写入链路与日志接口职责冲突。

### Verifiable Success Criteria（研究阶段定义）

1. 首批资源（用户/角色/权限）已提供并通过：
   - 根据 ID 查询单条
   - 带查询参数分页查询
   - 新增
   - 修改
   - 删除
2. ID 字段在数据库中为 BIGINT（64位），由后端雪花算法生成；在路由参数、请求体与响应中统一按 string 语义传输与处理。
3. 删除策略按表生效：软删表默认查询不返回已删除数据；硬删表删除后不可再查。
4. 日志类资源仅支持查询与删除，新增/修改请求被拒绝并返回可识别错误。
5. 前端在后续阶段可基于统一契约完成接口联调，无需临时字段映射补丁。
