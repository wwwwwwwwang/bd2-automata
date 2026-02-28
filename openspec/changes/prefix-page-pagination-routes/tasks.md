## 1. 路由清单冻结与基线确认

- [x] 1.1 扫描 `packages/api/src/routes/*.ts`，冻结所有 `.get('/', validate('query', paginationQuerySchema), ...)` 资源清单。
- [x] 1.2 产出旧路径基线表：`/api/<resource>`（仅分页 GET）。
- [x] 1.3 产出新路径目标表：`/api/<resource>/page`（与 1.2 一一对应）。

## 2. 后端路由机械迁移

- [x] 2.1 将清单内资源列表路由从 `.get('/')` 统一改为 `.get('/page')`。
- [x] 2.2 对每个含 `/:id` 的资源，确保 `GET /page` 注册在 `GET /:id` 之前。
- [x] 2.3 确认未误改非分页端点（详情/创建/更新/删除保持原路径）。

## 3. 权限数据迁移与缓存失效

- [x] 3.1 编写权限迁移 SQL：将分页 GET 的 `api_path` 从 `/api/<resource>` 更新为 `/api/<resource>/page`（脚本：`drizzle/0001_prefix_page_permissions_api_path.sql`，待上线执行）。
- [x] 3.2 为迁移 SQL 增加幂等保护（已在脚本中通过 `AND api_path NOT LIKE '%/page'` 实现，待上线执行验证）。
- [ ] 3.3 迁移后立即执行一次 `authz` 缓存版本 bump，强制失效旧权限缓存。
- [ ] 3.4 迁移后核对权限快照：不存在分页 GET 仍指向旧根路径的残留。

## 4. 前端调用契约同步

- [x] 4.1 扫描 `packages/web/src/api/**`，定位所有分页列表调用路径。
- [x] 4.2 将与后端直连的分页调用统一到新路径 `/page`（若存在网关层映射，则更新映射配置并保持调用端一致）。
- [ ] 4.3 复核分页页面（至少 role/table 代表页）在真实接口下可加载、翻页、筛选。

## 5. 回归测试与性质验证（PBT导向）

- [ ] 5.1 新增/更新契约测试：`GET /api/<resource>/page` 可达，`GET /api/<resource>` 返回 404。
- [ ] 5.2 新增/更新 RBAC 测试：`method + /api/<resource>/page` 精确命中放行，旧路径权限不放行新路径。
- [ ] 5.3 新增路由优先级测试：`/page` 不得被 `/:id` 捕获。
- [ ] 5.4 新增迁移幂等测试：重复执行权限迁移不产生 `/page/page`。
- [ ] 5.5 新增缓存收敛测试：cache-hit 与 cache-miss 在版本 bump 后结果一致。

## 6. 发布与回滚演练

- [ ] 6.1 按固定顺序执行发布：路由代码 -> 权限迁移 -> cache bump -> 回归验证。
- [ ] 6.2 监控发布后 404/403 指标，若异常触发回滚。
- [ ] 6.3 回滚演练：代码回滚、权限路径回写、回滚后再次 cache bump。
- [ ] 6.4 将本次迁移资源清单、SQL、验证结果归档到变更记录中。
