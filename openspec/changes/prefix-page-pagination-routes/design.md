## Overview

本设计用于落实 `prefix-page-pagination-routes`：将所有已存在分页列表接口从根路径 `/` 统一迁移到 `/page`，并在不改变分页参数与响应语义的前提下，保证 RBAC（`method + path` 精确匹配）与前端调用契约一致。

## Goals

- 全量迁移现有分页 GET 路由：`GET /` -> `GET /page`。
- 迁移后旧根路径不兼容，明确返回 404，不提供别名。
- `permissions.apiPath` 统一为绝对 API 路径格式：`/api/<resource>/page`。
- 路由改造、权限数据迁移、缓存失效在同一发布窗口原子完成。
- 与 `implement-api-crud-fullstack` 解耦：本变更只处理路径，不处理响应结构改造。

## Non-Goals

- 不修改分页 query 规则（`page/limit`）。
- 不修改分页响应结构（`items + meta`）。
- 不重命名详情/创建/更新/删除端点。
- 不引入网关重写兼容层。

## Decisions (Zero-Ambiguity)

### 1) 迁移范围（冻结）

基于路由扫描，迁移对象为所有使用 `paginationQuerySchema` 且当前列表路由为 `.get('/')` 的资源：

- users
- roles
- permissions
- tasks
- events
- dictionary-items
- dictionary-types
- gift-codes
- game-accounts
- daily-attendance-logs
- weekly-attendance-logs
- redemption-logs
- event-participation-logs
- email-templates
- email-queue
- email-stats
- logs

### 2) 路由目标

- 目标列表路径：`GET /page`
- 旧列表路径：`GET /` 迁移后不再提供列表能力
- 预期行为：旧路径返回 404（不兼容）

### 3) RBAC 路径规范

- 保持现有精确匹配模型：`request.method + normalized(request.path)` 对比 `permission.httpMethod + normalize(permission.apiPath)`。
- `permissions.apiPath` 存储格式固定为绝对路径：`/api/<resource>/page`。
- 不允许绝对与相对路径混存。

### 4) 路由优先级约束

在同一资源 router 中必须保证静态路由先于动态参数路由注册：

1. `GET /page`
2. `GET /:id`

避免 `/page` 被误判为 `:id`。

### 5) 数据迁移与缓存策略

- 迁移条件：`http_method='GET'` 且 `api_path` 命中旧列表绝对路径集合（`/api/<resource>`）。
- 迁移变换：`api_path = api_path + '/page'`（已是 `/page` 结尾的记录跳过，保证幂等）。
- 迁移完成后立即执行授权缓存版本 bump（`authz:version`），使旧缓存失效。

### 6) 发布顺序（原子窗口）

同一窗口按顺序执行：

1. 发布后端路由代码（包含 `/page`）
2. 执行权限路径迁移 SQL
3. 立即 bump 授权缓存版本
4. 运行回归与 smoke

任一步失败即进入回滚。

## Rollback Plan

- 代码回滚：恢复各资源 `.get('/page')` 到 `.get('/')`。
- 数据回滚：将迁移命中记录从 `/api/<resource>/page` 回写为 `/api/<resource>`。
- 缓存回滚：回滚后再次 bump `authz:version`，确保客户端命中新语义缓存。

## Risks & Mitigations

- 风险：权限数据未同步导致批量 403。
  - 缓解：上线窗口内强制执行 SQL 迁移 + cache bump，且发布闸门检查 403 异常。
- 风险：`/page` 与 `/:id` 冲突。
  - 缓解：静态优先注册，并加路由匹配回归测试。
- 风险：与 `implement-api-crud-fullstack` 并行改同文件导致双变量故障。
  - 缓解：本变更只改路径，响应结构改造后置。

## Verification Criteria

- 所有分页列表接口仅 `/page` 可用，旧根路径不可用（404）。
- RBAC 在新路径上授权结果与迁移前等价（路径文本变化不改变权限边界）。
- 权限表分页接口路径全部收敛为 `/api/<resource>/page`。
- 前端代表性列表（role/table）可加载、翻页、筛选。
- 回归覆盖路径可达性、RBAC 精确匹配、缓存失效后一致性。
