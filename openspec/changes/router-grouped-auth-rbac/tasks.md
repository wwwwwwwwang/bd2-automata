## 1. 路由分组重构（业务域）

- [x] 1.1 盘点 `packages/api/src/index.ts` 当前所有受保护端点，产出“业务域 -> Router -> 前缀”分组清单。
- [x] 1.2 将受保护端点迁移到业务域 Router 组，统一在组级挂载 `authMiddleware` 与 `rbacMiddleware`。
- [x] 1.3 校验中间件顺序固定为 `auth -> rbac`，移除重复或旁路挂载。

## 2. /api/auth 子路由收敛

- [x] 2.1 识别 `/api/auth` 下匿名接口与需登录接口边界。
- [x] 2.2 将 `/api/auth` 下需登录接口（`/me`、`/logout`、密码/邮箱变更等）迁入受保护 auth 子组并启用 `auth + rbac`。
- [x] 2.3 保持登录/注册/找回密码/验证等匿名接口公开，确保不受 RBAC 影响。

## 3. RBAC 判定契约统一（method + path）

- [x] 3.1 在 `packages/api/src/middlewares/auth.ts` 固化授权输入：请求 method 与规范化 path。
- [x] 3.2 在授权检查中使用 `method + path` 精确匹配 `permissions.httpMethod + permissions.apiPath`。
- [x] 3.3 无匹配返回 403，匹配放行；补齐错误分支的一致响应。

## 4. 权限聚合与软删过滤一致性

- [x] 4.1 校验 `packages/api/src/services/permissionService.ts` 权限聚合链路固定为 `users_to_roles -> roles_to_permissions -> permissions`。
- [x] 4.2 确保权限聚合查询包含 `isDeleted = false` 过滤。
- [x] 4.3 清理角色名/路由名硬编码授权分支，避免绕过关系链判定。

## 5. 缓存语义一致性与失效策略

- [x] 5.1 保持缓存仅做加速，不改变授权判定语义（命中/未命中结果一致）。
- [x] 5.2 明确并实现缓存失效触发点：角色变更、权限变更、用户角色变更。
- [x] 5.3 验证失效后授权结果在可预期刷新窗口内收敛到 DB 真值。

## 6. 验收与回归

- [x] 6.1 覆盖受保护路由回归：匿名访问应拒绝，具备匹配权限应放行，无匹配应 403。
- [x] 6.2 覆盖 `/api/auth` 回归：需登录接口全部受 RBAC 控制，匿名接口保持可用。
- [x] 6.3 覆盖缓存一致性回归：缓存命中/未命中授权结果一致。
- [x] 6.4 覆盖路径规范化回归：动态路由在规范化后可稳定命中预期权限。
