## Overview

本设计用于落实 `implement-api-crud-fullstack` 变更：在不偏离现有 `route -> service -> drizzle(shared schema)` 分层的前提下，先完成后端 API 契约统一（用户/角色/权限域优先），再进行前端接入与联调。

## Goals

- 统一 ID 策略：数据库主键为 `BIGINT(64位)`，由后端雪花算法生成；API 与前端统一以 `string` 传输与处理 ID。
- 统一 CRUD 接口形态：单条查询、分页查询、新增、修改、删除。
- 明确删除策略：核心业务表软删除；关联/中间表硬删除。
- 明确日志策略：日志资源仅支持查询与删除，不支持人工新增/修改。
- 与 `backup_schema_only.sql` 保持字段、约束、关系一致。

## Non-Goals

- 本阶段不扩展用户/角色/权限域以外的新业务域。
- 不改变 Cloudflare Worker、Hono、D1、Drizzle 的既有技术栈。
- 不引入与当前分层无关的额外抽象层。

## Architecture Decisions

### 1) ID 规范（Breaking）

- DB 层：主键与外键统一 `BIGINT(64位)`。
- 生成层：仅后端服务层生成雪花 ID，客户端不得生成业务主键。
- 契约层：路由参数、请求体中的关联 ID、响应体中的 ID 字段统一 `string`。
- 映射层：service 内进行 `string <-> BIGINT` 显式转换，避免隐式类型漂移。

### 2) API 统一契约

- 单条查询：按 ID 返回单资源。
- 分页查询：统一 `page/limit` 输入，统一分页元信息输出。
- 新增/修改：采用 shared zod schema 做输入校验。
- 删除：按“表类型策略”决定软删或硬删。

### 3) 删除语义按表区分

- 软删表（核心业务表）：写入删除标记（如 `deleted_at`/`is_deleted`），默认查询自动过滤已删除记录。
- 硬删表（关联/中间表）：执行物理删除，删除后不可查询。
- 查询默认行为必须一致：除非显式管理员查询场景，不返回软删数据。

### 4) 日志资源策略

- 允许：按条件查询、按策略删除。
- 禁止：人工新增、人工修改。
- 约束：日志写入来源为系统运行链路，接口层拒绝非系统写入入口。

## Data & Contract Design

### ID 字段约定

- 响应示例：
  - `id: string`
  - `userId: string`
  - `roleId: string`
  - `permissionId: string`
- 请求参数示例：
  - `GET /users/:id` 中 `id` 为 string。
  - 关联写入时关联 ID 字段为 string。

### 分页约定

- 输入：`page`, `limit`, 以及资源域过滤参数。
- 输出：`items + meta(total, page, limit)`。

## Implementation Plan (High-level)

1. shared schema 与 SQL 对齐（字段/关系/删除字段/唯一约束）。
2. API 用户/角色/权限及关联关系接口对齐统一契约。
3. 日志资源接口收敛为“查询+删除”。
4. 前端 API 调用层统一 ID string 处理并完成联调。

## Risks & Mitigations

- 风险：历史 number/string ID 混用导致关联失败。
  缓解：统一 DTO 与 schema，集中转换并覆盖关键测试。
- 风险：软删/硬删边界不清。
  缓解：按表建立清单并在 service 层固化默认查询行为。
- 风险：日志写入链路被人工入口污染。
  缓解：路由层显式拒绝日志新增/修改接口。

## Verification Criteria

- 用户/角色/权限域具备完整 CRUD（含分页）。
- 所有接口对外 ID 均为 string，DB 持久化为 BIGINT 且由后端雪花生成。
- 软删表默认查询不返回已删除数据；硬删表删除后不可再查。
- 日志类资源新增/修改请求被拒绝，查询/删除可用。
