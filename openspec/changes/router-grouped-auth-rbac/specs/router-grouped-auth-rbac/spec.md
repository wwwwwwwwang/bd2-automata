## ADDED Requirements

### Requirement: 受保护路由按业务域分组并统一挂载鉴权链
系统 MUST 将所有受保护 API 按业务域进行 Router 分组，并在组级统一执行 `authMiddleware -> rbacMiddleware`。

#### Scenario: 分组级中间件顺序固定
- **GIVEN** 任一受保护业务域 Router 被注册到应用
- **WHEN** 请求进入该 Router
- **THEN** 系统必须先执行 `authMiddleware`
- **AND** 仅在认证通过后执行 `rbacMiddleware`

#### Scenario: 受保护端点无旁路
- **GIVEN** 任一声明为“需登录”的业务接口
- **WHEN** 检查其挂载方式
- **THEN** 该接口必须位于受保护业务域 Router 下
- **AND** 不允许绕过组级 `auth + rbac` 链路单独挂载

### Requirement: /api/auth 中需登录接口全部纳入 RBAC
系统 MUST 将 `/api/auth` 下所有“需登录”接口纳入 RBAC 判定，不允许仅认证不授权。

#### Scenario: 已登录接口纳入授权
- **GIVEN** `/api/auth/me`、`/api/auth/logout`、密码/邮箱变更等已登录接口
- **WHEN** 请求访问这些接口
- **THEN** 必须同时经过 `authMiddleware` 与 `rbacMiddleware`

#### Scenario: 匿名接口保持公开
- **GIVEN** 登录、注册、找回密码、邮箱验证等匿名接口
- **WHEN** 请求访问这些接口
- **THEN** 不应进入受保护组
- **AND** 不触发 RBAC 判定

### Requirement: 授权判定采用 method + path 精确匹配
系统 MUST 使用请求 `method + path` 与权限表 `httpMethod + apiPath` 做精确匹配决定放行或拒绝。

#### Scenario: 匹配成功放行
- **GIVEN** 用户通过角色关联到某权限，且该权限与请求 `method + path` 完全一致
- **WHEN** 访问该接口
- **THEN** RBAC 判定通过并允许继续执行处理逻辑

#### Scenario: 无匹配拒绝
- **GIVEN** 请求 `method + path` 在用户聚合权限中不存在
- **WHEN** 访问受保护接口
- **THEN** RBAC 判定失败并返回 403

### Requirement: 权限聚合来源固定为用户-角色-权限关系链
系统 MUST 仅通过 `users_to_roles -> roles_to_permissions -> permissions` 链路聚合用户权限。

#### Scenario: 关系链路驱动授权
- **GIVEN** 用户绑定角色，角色绑定权限
- **WHEN** 执行授权检查
- **THEN** 系统应基于关系链查询结果构建可用权限集合
- **AND** 不使用角色名硬编码规则替代关系链判定

#### Scenario: 软删权限不可参与授权
- **GIVEN** 某权限记录 `isDeleted = true`
- **WHEN** 聚合用户权限
- **THEN** 该权限不得进入授权匹配集合

### Requirement: 缓存优化不得改变授权语义
系统 MAY 使用缓存优化权限查询，但 MUST 保证缓存命中与未命中语义一致。

#### Scenario: 缓存命中与未命中一致性
- **GIVEN** 同一用户在同一时刻请求同一接口
- **WHEN** 分别走缓存命中与缓存未命中路径
- **THEN** 授权结果必须一致

#### Scenario: 变更后可预期收敛
- **GIVEN** 角色/权限关系发生变更
- **WHEN** 变更生效并经过约定刷新窗口
- **THEN** 授权结果必须与数据库真值一致

## ADDED Property-Based Test Properties

### Property: Middleware Order Preservation
**INVARIANT:** 对任意受保护请求，`authMiddleware` 总在 `rbacMiddleware` 之前执行，且 auth 失败时 rbac 不会执行。

**FALSIFICATION:** 生成随机受保护路由与认证状态组合，记录中间件调用序列；若出现 `rbac` 先于 `auth` 或 auth 失败后仍执行 rbac，则失败。

### Property: Exact Match Determinism
**INVARIANT:** 对任意请求 `(method, path)`，授权结果仅由该二元组是否存在于用户权限集合决定，输入相同结果恒定。

**FALSIFICATION:** 随机生成权限集合与请求集，多次重复判定；若相同 `(method, path)` 得到不一致结果或被其他字段影响，则失败。

### Property: No Bypass for Protected Endpoints
**INVARIANT:** 任意标记为“需登录”的端点都不可在无 `auth + rbac` 的情况下被访问成功。

**FALSIFICATION:** 枚举路由注册表并对每个受保护端点尝试匿名访问；若出现 2xx/业务成功响应则失败。

### Property: Authorization Monotonicity by Permission Set
**INVARIANT:** 当用户权限集合从 `P` 扩展为 `P'` 且 `P ⊆ P'` 时，原本允许的请求集合不会减少。

**FALSIFICATION:** 随机生成 `P` 与扩展集 `P'`，比较 allow 集合；若存在 `allow(P)` 中请求在 `allow(P')` 被拒绝，则失败。

### Property: Cache Semantic Equivalence
**INVARIANT:** 同一时刻同一用户同一请求，缓存命中与直查数据库的判定结果相等。

**FALSIFICATION:** 随机切换 cache on/off 与 TTL 边界请求；若命中与未命中结果出现差异，则失败。
