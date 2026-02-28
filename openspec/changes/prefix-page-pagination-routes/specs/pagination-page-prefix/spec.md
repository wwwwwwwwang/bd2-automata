## ADDED Requirements

### Requirement: 全量分页列表路由统一使用 /page 前缀
系统 MUST 将当前所有分页 GET 列表路由从根路径 `/` 迁移为 `/page`，并禁止新增或保留“根路径列表”实现。

#### Scenario: 迁移范围全量覆盖
- **GIVEN** 资源路由中存在 `.get('/', validate('query', paginationQuerySchema), ...)` 的分页列表接口
- **WHEN** 执行本次迁移
- **THEN** 这些分页列表接口都必须改为 `.get('/page', validate('query', paginationQuerySchema), ...)`
- **AND** 迁移资源至少包括：users、roles、permissions、tasks、events、dictionary-items、dictionary-types、gift-codes、game-accounts、daily-attendance-logs、weekly-attendance-logs、redemption-logs、event-participation-logs、email-templates、email-queue、email-stats、logs

#### Scenario: 旧根路径不兼容
- **GIVEN** 任一迁移后的资源列表接口
- **WHEN** 访问旧路径 `GET /api/<resource>`
- **THEN** 必须返回 404
- **AND** 不允许通过别名、重写或隐式兜底继续返回列表数据

### Requirement: 分页路径迁移不得改变分页语义
系统 MUST 保持分页参数与分页响应结构不变，仅允许路径变化。

#### Scenario: 分页参数语义保持
- **GIVEN** 合法分页请求参数（page/limit）
- **WHEN** 访问 `GET /api/<resource>/page`
- **THEN** 分页校验规则必须与迁移前一致

#### Scenario: 分页响应契约保持
- **GIVEN** 分页列表请求成功
- **WHEN** 返回响应
- **THEN** 响应结构必须保持既有分页契约（items + meta）
- **AND** 不引入额外字段映射补丁作为变更前提

### Requirement: RBAC 权限路径统一为绝对 API 路径并保持精确匹配
系统 MUST 继续使用 `method + path` 精确匹配授权，并将分页权限路径统一存储为绝对 API 路径 `/api/<resource>/page`。

#### Scenario: 新路径命中放行
- **GIVEN** 用户权限中存在 `httpMethod=GET` 且 `apiPath=/api/<resource>/page`
- **WHEN** 用户访问对应分页接口
- **THEN** RBAC 判定通过

#### Scenario: 旧路径权限无效
- **GIVEN** 用户权限仅包含旧路径 `/api/<resource>`
- **WHEN** 用户访问新分页路径 `/api/<resource>/page`
- **THEN** RBAC 判定失败并返回 403

### Requirement: 路由静态优先级必须防止 /page 被 :id 吞噬
系统 MUST 在同一资源路由内保证 `GET /page` 的注册优先级高于 `GET /:id`。

#### Scenario: /page 命中列表处理器
- **GIVEN** 同一资源同时存在 `GET /page` 与 `GET /:id`
- **WHEN** 请求路径为 `/api/<resource>/page`
- **THEN** 必须命中分页列表处理器
- **AND** 不得进入 `:id` 解析路径

### Requirement: 路由迁移与权限迁移同窗原子发布
系统 MUST 在同一发布窗口内完成路由切换、权限数据迁移与授权缓存失效，不允许分阶段半迁移上线。

#### Scenario: 同窗顺序执行
- **GIVEN** 发布窗口开始
- **WHEN** 执行变更
- **THEN** 必须按顺序完成：路由发布 -> 权限路径迁移 -> authz 缓存版本 bump -> 回归验证

#### Scenario: 任一步失败触发回滚
- **GIVEN** 发布窗口内任一关键步骤失败
- **WHEN** 判定变更失败
- **THEN** 必须执行代码、权限数据与缓存版本的回滚流程

## ADDED Property-Based Test Properties

### Property: Page Prefix Exclusivity
**INVARIANT:** 对任一已迁移资源，分页列表仅在 `/api/<resource>/page` 可达，`/api/<resource>` 不可达。

**FALSIFICATION:** 随机抽取迁移资源集合并发送请求；若出现旧根路径返回 2xx 或新路径不可达，则失败。

### Property: Pagination Contract Preservation
**INVARIANT:** 对任一有效 `(page, limit)` 输入，迁移前后分页响应的语义等价（相同输入下 items/meta 结构保持）。

**FALSIFICATION:** 生成分页参数随机样本并比较迁移前后响应；若出现结构漂移或分页规则变化，则失败。

### Property: RBAC Exact Match Stability Under Path Rename
**INVARIANT:** 在权限数据执行 `oldPath -> oldPath/page` 的等价迁移后，授权边界仅随路径重命名移动，不改变业务允许集合。

**FALSIFICATION:** 构造请求与权限集合，执行路径重写前后判定对比；若存在非预期放宽/收紧，则失败。

### Property: Route Precedence Safety
**INVARIANT:** 对任一同时存在 `/page` 与 `/:id` 的资源，路径 `/page` 永远不会被动态参数路由捕获。

**FALSIFICATION:** 生成资源路径并请求 `/page`；若返回 `:id` 校验错误或命中详情处理逻辑，则失败。

### Property: Permission Migration Idempotency
**INVARIANT:** 权限路径迁移脚本对同一数据重复执行，结果不应再次追加 `/page`。

**FALSIFICATION:** 对同一初始数据执行两次迁移；若出现 `/page/page` 或行数漂移，则失败。

### Property: Cache-Version Convergence
**INVARIANT:** 在权限迁移后执行 cache version bump，缓存命中与未命中授权结果最终收敛一致。

**FALSIFICATION:** 在 bump 前后随机切换 cache-hit/cache-miss 请求对；若超出约定窗口后结果仍不一致，则失败。
