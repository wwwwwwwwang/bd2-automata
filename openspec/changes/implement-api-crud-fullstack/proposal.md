## Why

当前项目需要在 `packages/api` 快速形成可联调的后端基础能力，并与 `backup_schema_only.sql` 的业务表结构对齐。现状虽有部分路由与服务实现，但接口能力、ID 规范、删除语义和日志表策略尚未统一，导致后续前端页面开发与联调存在较高不确定性。

## What Changes

- 建立后端 CRUD 统一约束：首批优先覆盖用户/角色/权限域（含关联关系），并提供统一接口形态（单条查询、分页查询、新增、修改、删除）。
- **ID 策略修订**：统一采用「SQLite 自增 + number safe-integer gate」。主键由数据库分配，服务层 create 不手工写 `id`。
- 统一删除策略为“按表区分”：核心业务表软删除，关联/中间表硬删除。
- 明确日志表策略为“只读+删除”：日志由系统运行时产生，不提供人工新增与修改接口。
- 形成“先后端接口 -> 再前端页面 -> 最后接口联调”的实施顺序与依赖约束。

## Capabilities

### New Capabilities
- `api-crud-autoincrement-id`: 在 API 层建立统一“数据库自增主键 + safe-integer gate”的约束与 CRUD 接口协议。
- `api-domain-user-role-permission`: 落地用户/角色/权限及其关联关系的首批后端接口能力。
- `api-log-read-delete`: 为日志类资源提供只读查询与删除能力，并限制为系统写入来源。
- `api-delete-strategy-by-table`: 定义并实施“按表区分”的删除语义（软删/硬删）及查询默认行为。
- `frontend-api-contract-integration`: 在后端接口稳定后，前端按统一契约接入并完成联调。

## Impact

- 受影响目录：
  - `packages/api/src/routes/**`
  - `packages/api/src/services/**`
  - `packages/shared/src/db/schema/**`
  - `packages/web/src/api/**`（后续联调阶段）
- 受影响系统：Cloudflare Worker API（Hono）+ D1（Drizzle）+ Web 前端调用层。
- 风险与约束：
  - 路由层必须统一经过 `parseId` safe-integer 校验，避免类型漂移。
  - 软删/硬删并存需明确每张表归属与默认查询过滤规则。
  - 日志表只读+删除策略需与系统运行写入链路保持一致，避免人工写入污染审计数据。

### Constraint Sets（供后续 design/specs 使用）

#### Hard Constraints
- 全域主键策略统一为 SQLite integer 自增，应用层 insert payload 不得手工写 `id`。
- 路由层 ID 必须通过 `parseId` 执行 safe-integer 校验。
- 首批资源优先用户/角色/权限域，必须先完成后端接口。
- 日志类表仅支持查询与删除，不支持新增/修改。
- 删除语义采用“按表区分”，不能一刀切。

#### Soft Constraints
- 延续当前 route -> service -> drizzle(shared schema) 的分层模式。
- 统一分页与响应契约，减少前端页面二次映射。
- 优先复用 shared 中既有 zod 校验与 schema 导出模式。

### Verifiable Success Criteria

1. 首批资源（用户/角色/权限）提供并通过：按 ID 查询、分页查询、新增、修改、删除。
2. ID 全链路一致：DB 自增分配，create 不写 `id`，路由参数经 `parseId` safe-integer 校验。
3. 删除策略按表生效：软删表默认查询不返回已删除数据；硬删表删除后不可再查。
4. 日志类资源仅支持查询与删除，新增/修改请求被拒绝并返回可识别错误。
5. 前端可基于统一契约完成接口联调，无需临时字段映射补丁。
