## Overview

本设计用于将现有鉴权改造为“按业务域 Router 分组 + 统一 RBAC 判定契约”，并在不改变技术栈（Hono + D1 + Drizzle）的前提下，为后续“用户-角色-权限”扩展提供稳定边界。

## Goals

- 受保护路由按业务域分组，统一挂载 `authMiddleware -> rbacMiddleware`。
- `/api/auth` 下所有“需登录”接口全部纳入 RBAC，不保留“仅认证”旁路。
- 授权判定统一使用 `method + path` 精确匹配，无匹配即拒绝。
- 权限来源统一走 `users_to_roles -> roles_to_permissions -> permissions` 链路。
- 保持现有 `parseId` 与 soft-delete 约束一致，不引入兼容分支。

## Non-Goals

- 不新增业务域接口。
- 不变更运行时技术栈与部署形态。
- 不引入基于角色名硬编码的路由分支授权逻辑。

## Architecture Decisions

### 1) 路由分组策略（按业务域）

- 以业务域为单位组织受保护 Router（例如：user / role / permission / dictionary / account / auth-protected）。
- 统一在组级挂载中间件：先 `authMiddleware`，后 `rbacMiddleware`。
- 任何受保护端点不得绕过组级中间件单独暴露。

### 2) 授权匹配契约（精确匹配）

- RBAC 判定输入固定为请求 `method` 与规范化后的 `path`。
- 匹配规则为 `permissions.httpMethod == request.method` 且 `permissions.apiPath == request.path`。
- 无匹配记录或用户未关联匹配权限，一律返回 403。

### 3) /api/auth 子路由策略

- `/api/auth` 下原本“只校验登录”的接口（如 `/me`、`/logout`、密码/邮箱变更）全部进入 RBAC。
- 登录、注册、找回密码、邮件验证等匿名接口保持公开，不进入受保护组。

### 4) 权限聚合与缓存约束

- 权限聚合仅以关系链路查询结果为准，缓存仅做性能优化，不可改变授权语义。
- 缓存命中与未命中必须得到一致授权结果。
- 权限/角色关系变更后，授权行为在约定刷新窗口内与 DB 一致。

### 5) 约束延续

- ID 相关参数校验继续使用 `parseId` safe-integer gate。
- 权限实体查询至少满足 `isDeleted = false` 过滤。
- 保持 `route -> service -> shared schema` 分层，不新增中间抽象层。

## Route Group Matrix (Target)

| 分组 | 典型前缀 | 中间件 | 说明 |
|---|---|---|---|
| public-auth | `/api/auth/login` 等 | 无 | 匿名可访问 |
| auth-protected | `/api/auth/me` 等 | `auth -> rbac` | 登录后操作全部纳入 RBAC |
| user-domain | `/api/users` | `auth -> rbac` | 用户域管理接口 |
| role-domain | `/api/roles` | `auth -> rbac` | 角色域管理接口 |
| permission-domain | `/api/permissions` | `auth -> rbac` | 权限域管理接口 |
| other-protected-domains | 业务域前缀 | `auth -> rbac` | 统一策略扩展 |

## Risks & Mitigations

- 路由重挂遗漏导致鉴权缺口
  - 通过“分组清单 + 启动期路由注册检查 + 回归用例”降低风险。
- 动态路由规范化不一致导致误拒绝
  - 固化 path 规范化函数，统一在 RBAC 判定前处理。
- 缓存陈旧导致短时不一致
  - 明确失效触发点（角色变更、权限变更、用户角色变更）并纳入任务实现。

## Verification Criteria

- 所有受保护组都统一经过 `auth + rbac`，无旁路。
- `/api/auth` 需登录接口全部受 RBAC 控制。
- 授权严格基于 `method + path`；匹配通过，未匹配 403。
- 缓存命中/未命中授权结果一致。
- 角色/权限关系变更后，授权行为在可预期刷新窗口内收敛到 DB 真值。
