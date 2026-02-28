## Why

当前后端多个资源的分页列表接口使用子路由根路径 `/`（例如资源挂载后形成 `GET /users`、`GET /roles` 语义），需求要求统一改为显式分页前缀 `/page`，避免列表接口继续直接占用根路径。

该调整不是单点路径替换：鉴权 RBAC 当前使用 `method + path` 精确匹配，前端还存在 `.../list` 风格 API 调用与代理映射，若不先收敛约束会出现 404/403 与联调漂移。

## What Changes

- 定义并收敛“分页列表路径前缀规范”：分页查询入口由根路径 `/` 迁移到 `/page`。
- 约束迁移范围：API 路由层、权限数据（`permissions.apiPath`）、前端 API 调用映射、测试契约与回归脚本。
- 约束迁移顺序：先固化后端路径规范与 RBAC 路径语义，再同步前端调用层，最后执行跨包回归。
- 明确 OpenSpec 重叠依赖风险：与 `implement-api-crud-fullstack` 在路由与契约层有直接重叠，需要避免并行冲突改动。

## Scope Boundary

### In Scope
- `packages/api/src/routes/**` 中所有“分页列表 GET 路由”。
- `packages/api/src/middlewares/auth.ts` 所依赖的 RBAC path 匹配语义对应的数据侧（`permissions.apiPath`）。
- `packages/web/src/api/**` 中与分页列表相关的请求路径映射。
- 与分页路由相关的契约/回归测试（尤其 path、RBAC、列表可达性）。

### Out of Scope
- 分页参数语义变更（`page/limit` 规则保持不变）。
- 分页响应结构变更（`items + meta` 不在本变更内重构）。
- 非分页接口（详情、创建、更新、删除）路径重命名。

## Constraint Sets

### Hard Constraints
1. 分页列表接口必须统一使用 `/page` 路径，不再新增或保留“以 `/` 作为最终分页入口”的新实现。
2. RBAC 授权判定保持 `method + path` 精确匹配语义，不引入模糊匹配兜底。
3. 任何分页路径迁移必须同步更新权限数据中的 `apiPath`，否则视为不合格迁移。
4. API 与 Web 的路径契约必须同步落地，禁止“后端已改、前端未改”的半迁移状态进入交付。
5. 与 `implement-api-crud-fullstack` 重叠文件需按单一顺序变更，禁止并行分支各自改同一路由契约。

### Soft Constraints
1. 延续现有 route -> service -> shared schema 分层，不把路径策略下沉到 service。
2. 优先采用集中配置/常量化方式管理分页入口路径，降低后续二次迁移成本。
3. 保持测试骨架可复用：现有 auth/rbac 与分页契约测试优先扩展，不重复造轮子。

## Dependency & Overlap Risk

- 与 `implement-api-crud-fullstack` 重叠点：
  - 路由契约统一（分页列表路径）
  - 前后端联调路径
  - 可能共享受影响文件：`packages/api/src/index.ts`、`packages/api/src/routes/*.ts`、`packages/web/src/api/**/*.ts`
- 风险：两项变更并行推进会出现“契约双变量变化（路径 + 响应）”导致问题定位困难。
- 约束：本变更聚焦“路径前缀迁移”，不混入响应结构改造。

## Verifiable Success Criteria

1. 所有受管分页列表接口仅通过 `/page` 可访问，且请求参数与响应分页语义保持不变。
2. 受 RBAC 保护的分页接口在迁移后授权结果与迁移前一致（仅路径文本变化，不改变权限边界）。
3. 权限数据中分页接口 `apiPath` 完成同步迁移，不存在“代码新路径 + 数据旧路径”残留。
4. 前端分页页面（至少 role/table 代表性页面）在真实接口下可正常加载、翻页、筛选。
5. 回归测试覆盖“路径可达 + 鉴权匹配 + 前后端调用契约”，并通过。

## Rollback Points

1. 路由层回滚点：保留迁移前路由清单与对应测试快照，可快速恢复旧路径注册。
2. 权限数据回滚点：保留迁移前 `permissions` 路径映射快照，支持批量回写旧 `apiPath`。
3. 前端调用回滚点：保留 API 路径映射变更前版本，确保可回退到旧调用链。
4. 交付闸门：若出现批量 403/404，先回滚路径与权限映射，再做问题定位，不在故障态继续叠加变更。

## Notes from Prompt Enhancement

由于增强工具未配置外部增强服务，本提案使用本地代码证据完成结构化需求增强，已补齐：目标、约束、边界、验收、风险与回滚点。
