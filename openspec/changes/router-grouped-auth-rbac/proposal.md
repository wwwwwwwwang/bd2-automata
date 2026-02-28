## Why

当前 API 已有 `authMiddleware + rbacMiddleware`，但受保护路由主要以单一聚合组挂载，业务域边界不清，后续接入“按用户角色关联权限”时，容易出现：

- 路由分组与权限边界不一致
- `/api/auth` 中“已登录接口”与“需授权接口”混杂
- method/path 权限匹配规则不统一，导致误放行或误拒绝

为降低后续 RBAC 扩展成本，需要先把鉴权改造为 **Router 按业务域分组**，并明确统一的授权判定契约。

## Scope

本次研究覆盖：

- `packages/api/src/index.ts` 路由挂载与分组方式
- `packages/api/src/middlewares/auth.ts` 认证与授权中间件
- `packages/api/src/services/permissionService.ts` 用户权限聚合查询
- `packages/shared/src/db/schema/{users-to-roles,roles-to-permissions,relations}.ts` RBAC 关系建模
- `drizzle.config.ts` 与 shared schema 导出边界（保障后续变更可迁移）

不包含：

- 新增业务域功能接口
- 更换技术栈（Hono/D1/Drizzle）

## User-Confirmed Constraints

### C1. Router 分组边界（已确认）
系统 MUST 按**业务域**重组受保护路由，而非单一大组或按角色层级硬编码。

### C2. 权限匹配规则（已确认）
系统 MUST 采用 `method + path` **精确匹配** 进行授权判定。

### C3. auth 子路由策略（已确认）
`/api/auth` 下原“仅认证”接口（如 `/me`、`/logout`、密码/邮箱变更）后续 MUST 全部纳入 RBAC。

## Discovered Constraints

### Hard Constraints

1. 必须保留 `authMiddleware -> rbacMiddleware` 的执行顺序（先认证再授权）。
2. RBAC 权限来源必须基于 `users_to_roles -> roles_to_permissions -> permissions` 链路。
3. `permissions` 判定依赖 `httpMethod` 与 `apiPath` 字段；授权匹配必须以请求 method/path 为输入。
4. 受保护资源查询必须遵守软删过滤（至少权限实体 `isDeleted=false`）。
5. ID 相关参数校验必须沿用现有 `parseId` safe-integer gate 约束。

### Soft Constraints

1. 延续 `route -> service -> shared schema` 分层，不引入额外框架层。
2. 延续现有 Cloudflare Worker + D1 + Drizzle 运行链路。
3. 允许继续使用 KV 做权限缓存，但缓存命中不能改变授权语义。

## Dependencies

- `packages/api/src/index.ts`：路由分组总入口
- `packages/api/src/middlewares/auth.ts`：认证/授权中间件
- `packages/api/src/services/permissionService.ts`：权限聚合查询
- `packages/shared/src/db/schema/index.ts`：RBAC 关系表导出
- `packages/shared/src/db/schema/relations.ts`：关系建模

## Risks

1. **路由重组遗漏风险**：部分端点未正确挂载 RBAC，造成鉴权缺口。
2. **精确匹配风险**：动态路由路径规范化不一致会导致误拒绝。
3. **缓存陈旧风险**：角色权限变更后 TTL 窗口内可能短时授权不一致。
4. **权限模型漂移风险**：`permissions.httpMethod/apiPath` 与真实路由契约不一致。

## Verifiable Success Criteria

1. 受保护路由按业务域分组后，所有组均统一经过 `auth + rbac`。
2. `/api/auth` 中所有需登录接口均纳入 RBAC；无“仅认证”旁路。
3. 授权判定严格使用 `method + path`，无匹配即 403，匹配即放行。
4. 同一用户通过角色关联权限后，可稳定得到一致授权结果（含缓存命中/未命中）。
5. 角色/权限变更后，授权行为在可预期刷新窗口内与 DB 状态一致。

## Next

进入 `spec-plan` 前建议先补齐以下待确认点（已压缩为实现约束，不做架构发散）：

- 动态路由 path 规范化策略（用于精确匹配前的统一表示）
- RBAC 缓存失效触发点（角色变更、权限变更、用户角色变更）
- 路由分组清单（业务域 -> Router -> 中间件挂载矩阵）
