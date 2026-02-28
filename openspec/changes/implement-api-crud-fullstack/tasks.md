## 0. 基础结构与调用边界收敛（先行）

- [x] 0.1 `packages/api/src/index.ts` 拆分为入口装配、HTTP 应用装配与定时任务执行模块（`index.ts` / `app.ts` / `cron/scheduled.ts`）。
- [x] 0.2 新增 `packages/api/src/env.ts` 并统一 `packages/api/src/**` 的 `Env` 引用来源，移除对 `../index`/`../../index` 的类型耦合。
- [x] 0.3 将 `BaseTaskHandler` 与 `Task` 抽离至 `packages/api/src/cron/handlers/types.ts`，解除 handlers 对 `handlers/index.ts` 的反向依赖。
- [x] 0.4 重组 `packages/consumer/src`：抽离 `env.ts` 与 `routes/*`，入口仅负责路由装配，不改变现有占位路由行为。
- [x] 0.5 收敛 `consumer` 与 `shared` 依赖边界：移除 `consumer` 对 `@bd2-automata/shared` 的 tsconfig 路径映射、project reference 与未使用包依赖。
- [x] 0.6 明确 API/Consumer 邮件处理边界：新增 `EMAIL_PROCESS_MODE`（`api|consumer`）并在 `EmailProcessHandler` 中实现“本地处理 / 委托 Consumer”双路径。
- [x] 0.7 补齐边界契约测试：
  - API：`EmailProcessHandler` 模式分流单测（api / consumer / consumer 失败）
  - API：`dispatchToHandler(EMAIL_PROCESS)` 契约测试（api / consumer 可执行）
  - Consumer：`/`、`/process-emails`、`/send-notification` 占位契约测试

## 1. Schema 对齐（shared + SQL）

- [x] 1.1 对齐 `backup_schema_only.sql` 与 `packages/shared/src/db/schema/**`：字段、主外键、唯一约束。
- [x] 1.2 统一 ID 数据策略：DB 自增分配；服务层 create 不写 `id`；路由层 safe-integer gate。
- [x] 1.3 为软删表补齐删除标记字段与默认查询过滤所需定义。
- [x] 1.4 明确硬删表（关联/中间表）清单，避免误用软删。

## 2. 后端 API（首批资源）

- [x] 2.1 用户资源：实现并验证单条查询、分页、新增、修改、删除。
- [x] 2.2 角色资源：实现并验证单条查询、分页、新增、修改、删除。
- [ ] 2.3 权限资源：实现并验证单条查询、分页、新增、修改、删除。
- [x] 2.4 用户-角色、角色-权限关联接口：按表策略执行硬删。
- [x] 2.5 路由参数 ID 统一经过 `parseId`（safe-integer）处理。

## 3. 日志资源策略收敛

- [x] 3.1 仅保留日志查询接口。
- [x] 3.2 提供日志删除接口（按需求保留必要权限与筛选能力）。
- [x] 3.3 拒绝日志新增/修改请求并返回可识别错误码与错误信息。

## 4. 前端契约接入（后置阶段）

- [ ] 4.1 `packages/web/src/api/**` 与后端契约对齐（列表 `{items, meta}`、单对象响应）。
- [ ] 4.2 页面侧分页/详情/编辑删除调用统一契约，移除临时字段映射补丁。
- [ ] 4.3 完成用户/角色/权限域联调回归。

## 5. 验收与回归

- [ ] 5.1 验证首批资源 CRUD + 分页能力可用。
- [ ] 5.2 验证 ID 全链路一致：DB 自增、create 不写 `id`、`parseId` safe-integer gate。
- [ ] 5.3 验证删除策略：软删默认过滤、硬删删除后不可查。
- [ ] 5.4 验证日志策略：仅查询+删除，新增/修改被拒绝。
