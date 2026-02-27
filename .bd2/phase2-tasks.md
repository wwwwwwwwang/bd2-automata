# Phase 2: CRUD 契约规范化 - 详细任务清单

## 概述
统一所有资源端点的请求/响应格式，确保列表返回 `{items, meta}`，详情/增改删返回单对象，所有对外 ID 序列化为 string。

---

## Task 2.1: 标准化列表响应格式

### 目标
所有列表端点返回 `{ items: T[], meta: { total: number, page?: number, limit?: number } }`。

### 实施步骤
1. 创建共享响应类型（`packages/shared/src/types/api.ts`）：
   ```typescript
   export interface PaginatedResponse<T> {
     items: T[];
     meta: {
       total: number;
       page?: number;
       limit?: number;
     };
   }
   ```
2. 识别所有列表端点：
   - `GET /users`
   - `GET /roles`
   - `GET /permissions`
   - `GET /logs`
   - `GET /users/:id/roles`
   - `GET /roles/:id/permissions`
3. 更新每个列表 service 返回类型为 `PaginatedResponse<T>`。
4. 更新 route 层响应映射：
   ```typescript
   return c.json({
     items: result.items,
     meta: {
       total: result.total,
       page: query.page,
       limit: query.limit
     }
   });
   ```

### 验收标准
- [ ] 代码审查：所有列表 service 返回 `PaginatedResponse<T>`。
- [ ] 契约测试：所有列表端点响应包含 `items` 和 `meta` 字段。
- [ ] 契约测试：`meta.total` 为总记录数（不受分页影响）。
- [ ] 契约测试：`page=1, limit=10` 返回 `items.length ≤ 10`。

### 依赖
- 无，可立即开始。

---

## Task 2.2: 标准化详情/增改删响应格式

### 目标
所有详情/增改删端点返回单对象 `T`（非数组、非嵌套 `{data: T}`）。

### 实施步骤
1. 识别所有详情/增改删端点：
   - `GET /users/:id`
   - `POST /users`
   - `PUT /users/:id`
   - `PATCH /users/:id`
   - `DELETE /users/:id`
   - 其他资源的对应端点。
2. 确保 service 层返回单对象（非数组）。
3. 更新 route 层响应映射：
   ```typescript
   // 详情
   return c.json(user);

   // 创建
   return c.json(newUser, 201);

   // 更新
   return c.json(updatedUser);

   // 删除
   return c.json(deletedUser); // 或 c.body(null, 204)
   ```

### 验收标准
- [ ] 代码审查：所有详情/增改删 service 返回单对象。
- [ ] 契约测试：所有详情端点返回单对象（非数组）。
- [ ] 契约测试：所有创建端点返回 201 + 新创建对象。
- [ ] 契约测试：所有更新端点返回 200 + 更新后对象。
- [ ] 契约测试：所有删除端点返回 200/204。

### 依赖
- 无，可与 Task 2.1 并行。

---

## Task 2.3: 统一 ID 序列化为 string

### 目标
所有响应中的 ID 字段（`id`, `userId`, `roleId`, `permissionId` 等）序列化为 string。

### 实施步骤
1. 创建响应 DTO 映射函数（`packages/shared/src/mappers/`）：
   ```typescript
   export function toUserResponse(user: User): UserResponse {
     return {
       id: user.id.toString(),
       username: user.username,
       email: user.email,
       maxAccounts: user.maxAccounts,
       // ... 其他字段
     };
   }
   ```
2. 在所有 service 层或 route 层应用映射函数。
3. 确保关联 ID 字段也转换为 string：
   ```typescript
   export function toUserRoleResponse(userRole: UserRole): UserRoleResponse {
     return {
       userId: userRole.userId.toString(),
       roleId: userRole.roleId.toString(),
       // ... 其他字段
     };
   }
   ```

### 验收标准
- [ ] 代码审查：所有响应 DTO 映射函数将 ID 转换为 string。
- [ ] 契约测试：所有端点响应中的 ID 字段类型为 string。
- [ ] 类型测试：TypeScript 类型检查通过（响应类型定义 ID 为 string）。

### 依赖
- 依赖 Phase 1 Task 1.2（`parseId` 重构，确保 DB codec 正确）。

---

## Task 2.4: 实现用户资源 CRUD

### 目标
实现并验证用户资源的完整 CRUD 操作。

### 实施步骤
1. **列表查询**（`GET /users`）：
   - 支持分页（`page`, `limit`）。
   - 支持过滤（如 `username`, `email`）。
   - 默认过滤软删用户（`WHERE deleted_at IS NULL`）。
   - 返回 `PaginatedResponse<UserResponse>`。

2. **详情查询**（`GET /users/:id`）：
   - 验证 ID 格式（string 数字）。
   - 过滤软删用户。
   - 返回单个 `UserResponse` 或 404。

3. **创建**（`POST /users`）：
   - 验证请求体（zod schema）。
   - 调用 `generateId()` 生成 ID。
   - 插入 DB。
   - 返回 201 + `UserResponse`。

4. **更新**（`PUT /users/:id` 或 `PATCH /users/:id`）：
   - 验证 ID 格式与请求体。
   - 检查用户存在且未软删。
   - 更新 DB。
   - 返回 200 + `UserResponse`。

5. **删除**（`DELETE /users/:id`）：
   - 验证 ID 格式。
   - 软删除（`UPDATE SET deleted_at = NOW()`）。
   - 返回 200 + `UserResponse` 或 204。

### 验收标准
- [ ] 集成测试：创建用户 → 查询详情 → 更新 → 列表查询 → 删除 → 验证不可查。
- [ ] 集成测试：分页查询（page=1, limit=5）返回正确数量。
- [ ] 集成测试：软删后，列表与详情均不返回该用户。
- [ ] 契约测试：所有响应格式符合 Task 2.1-2.3 标准。

### 依赖
- 依赖 Phase 1 全部完成。
- 依赖 Task 2.1-2.3。

---

## Task 2.5: 实现角色资源 CRUD

### 目标
实现并验证角色资源的完整 CRUD 操作（同 Task 2.4 结构）。

### 实施步骤
参考 Task 2.4，替换为角色资源：
- `GET /roles`
- `GET /roles/:id`
- `POST /roles`
- `PUT /roles/:id` 或 `PATCH /roles/:id`
- `DELETE /roles/:id`

### 验收标准
- [ ] 集成测试：完整 CRUD 流程通过。
- [ ] 集成测试：软删后不可查。
- [ ] 契约测试：响应格式符合标准。

### 依赖
- 依赖 Phase 1 全部完成。
- 依赖 Task 2.1-2.3。
- 可与 Task 2.4 并行。

---

## Task 2.6: 实现权限资源 CRUD

### 目标
实现并验证权限资源的完整 CRUD 操作（同 Task 2.4 结构）。

### 实施步骤
参考 Task 2.4，替换为权限资源：
- `GET /permissions`
- `GET /permissions/:id`
- `POST /permissions`
- `PUT /permissions/:id` 或 `PATCH /permissions/:id`
- `DELETE /permissions/:id`

### 验收标准
- [ ] 集成测试：完整 CRUD 流程通过。
- [ ] 集成测试：软删后不可查。
- [ ] 契约测试：响应格式符合标准。

### 依赖
- 依赖 Phase 1 全部完成。
- 依赖 Task 2.1-2.3。
- 可与 Task 2.4-2.5 并行。

---

## Task 2.7: 实现用户-角色关联接口

### 目标
实现用户-角色关联的查询、分配、移除操作（硬删除）。

### 实施步骤
1. **查询用户的角色**（`GET /users/:id/roles`）：
   - 返回 `PaginatedResponse<RoleResponse>`。
   - 过滤软删角色（join 时添加 `WHERE roles.deleted_at IS NULL`）。

2. **查询角色的用户**（`GET /roles/:id/users`）：
   - 返回 `PaginatedResponse<UserResponse>`。
   - 过滤软删用户。

3. **分配角色给用户**（`POST /users/:id/roles`）：
   - 请求体：`{ roleIds: string[] }`。
   - 验证用户与角色均存在且未软删。
   - 事务插入 `users_to_roles` 表。
   - 返回 201 + 分配结果。

4. **移除用户的角色**（`DELETE /users/:id/roles/:roleId`）：
   - 硬删除 `users_to_roles` 记录。
   - 返回 200/204。

### 验收标准
- [ ] 集成测试：分配角色 → 查询用户角色 → 移除角色 → 验证不可查。
- [ ] 集成测试：软删角色后，用户角色列表不返回该角色。
- [ ] 集成测试：尝试分配已软删角色，返回 400/404。
- [ ] 契约测试：响应格式符合标准。

### 依赖
- 依赖 Task 2.4-2.5 完成。

---

## Task 2.8: 实现角色-权限关联接口

### 目标
实现角色-权限关联的查询、分配、移除操作（硬删除）。

### 实施步骤
参考 Task 2.7，替换为角色-权限关联：
- `GET /roles/:id/permissions`
- `GET /permissions/:id/roles`
- `POST /roles/:id/permissions`
- `DELETE /roles/:id/permissions/:permissionId`

### 验收标准
- [ ] 集成测试：完整关联流程通过。
- [ ] 集成测试：软删权限后，角色权限列表不返回该权限。
- [ ] 契约测试：响应格式符合标准。

### 依赖
- 依赖 Task 2.5-2.6 完成。
- 可与 Task 2.7 并行。

---

## Task 2.9: 编写 Phase 2 契约测试

### 目标
验证所有端点响应格式符合统一契约。

### 测试用例
1. **列表响应格式**：所有列表端点返回 `{items, meta}`。
2. **详情响应格式**：所有详情端点返回单对象。
3. **ID 类型一致性**：所有响应中的 ID 字段为 string。
4. **分页一致性**：`page=1, limit=10` 返回 ≤ 10 条记录。
5. **关联过滤**：软删实体不出现在关联查询中。

### 验收标准
- [ ] 所有测试用例通过。
- [ ] 测试覆盖所有资源端点（users/roles/permissions/关联）。

### 依赖
- 依赖 Task 2.4-2.8 全部完成。

---

## Phase 2 完成标准

- [ ] 所有 Task 2.1-2.9 验收标准通过。
- [ ] 代码审查通过（重点检查响应格式、ID 序列化）。
- [ ] 契约测试套件运行通过。
- [ ] 文档更新：在 `design.md` 中记录响应格式规范。

---

**预计工作量**: 5-7 天（1 名开发者）
**风险**: 中等（主要风险在关联查询的软删过滤逻辑）
**下一阶段**: Phase 3（删除语义与关联完整性）
