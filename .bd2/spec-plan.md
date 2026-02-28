# Spec Plan: implement-api-crud-fullstack

## 1. 变更范围与目标

### 1.1 核心目标
- 统一 ID 处理策略：采用 **SQLite 自增 ID + number safe-integer gate**，不采用 bigint/string codec。
- 规范 CRUD 契约：列表响应 `{items, meta}`，详情/增改删响应单对象；所有资源端点行为一致。
- 明确删除语义：核心表（users/roles/permissions）软删除，关联表（users_to_roles/roles_to_permissions）硬删除；查询默认过滤软删数据。
- 强化日志策略：logs 资源仅支持查询与删除，POST/PUT/PATCH 明确拒绝并返回稳定错误码。

### 1.2 影响范围
- **Backend**: `packages/api/src/routes/*`, `packages/api/src/services/*`, `packages/shared/src/db/schema/*`, ID 解析工具。
- **Frontend**: `packages/web/src/api/*`, `packages/web/src/types/*`, 组件中的 ID 使用逻辑。
- **Database**: 不引入 bigint/string 迁移；保持 SQLite integer 自增策略。
- **Tests**: 新增契约测试、集成测试、边界场景测试。

---

## 2. 技术风险与缓解

| 风险 | 严重性 | 影响 | 缓解措施 |
|------|--------|------|----------|
| 接近 `Number.MAX_SAFE_INTEGER` | 高 | ID 解析失败或精度风险 | 预检 `MAX(id)`，发布阻断超界 |
| 手工主键写入回归 | 高 | 自增策略失效、主键来源混乱 | 静态门禁禁止 `generateSnowflakeId` 与 insert 手工写 `id` |
| DTO/表字段漂移 | 中 | insert/update 失败 | DTO 与持久化字段显式映射 |
| 软删/硬删边界泄漏 | 中 | 已删除实体仍可见 | 统一软删谓词，关联查询同样过滤 |
| 响应契约不一致 | 中 | 前端适配复杂度上升 | 强制共享响应类型 + 契约测试 |

---

## 3. 实施路径（5 阶段）

### Phase 1: ID 与 Schema 基线
1. 保持 `parseId` safe-integer 校验（regex + `Number.isSafeInteger`）。
2. 所有 create 流程不传 `id`，由数据库分配。
3. 对齐 shared schema 与 SQL 字段命名。
4. 验证：边界 ID 与注册/登录链路通过。

### Phase 2: CRUD 契约规范化
1. 列表统一 `{ items, meta }`。
2. 详情/增改删统一返回单对象。
3. 路由参数统一通过 `parseId` 处理为安全整数。
4. 验证契约测试与类型检查。

### Phase 3: 删除语义与关联完整性
1. 核心表软删，关联表硬删。
2. 默认过滤软删记录。
3. 关联分配使用事务。

### Phase 4: 日志资源策略
1. logs 仅支持 GET/DELETE。
2. POST/PUT/PATCH 一律拒绝。

### Phase 5: 验证与回归保护
1. 契约测试：响应形状一致。
2. 集成测试：auth + 软删/硬删 + 关联。
3. 发布前后预检：FK/type/max-id/headroom。

---

## 4. 关键决策（固定）

- 当前采用：**SQLite 自增 + number safe-integer gate**。
- 当前不采用：**Snowflake 主键生成**。
- 当前不采用：**bigint/string codec 迁移方案**。

---

## 5. 下一步行动

1. 完成 `implement-api-crud-fullstack` 文档中的 ID 策略改写（从 BIGINT/Snowflake/string 改为自增/number）。
2. 将 `.bd2/phase1-tasks.md`、`.bd2/phase2-tasks.md` 的 Snowflake 与 codec 任务替换为自增策略任务。
3. 保留并执行发布门禁：静态扫描、预检 SQL、回归与观测阈值。
