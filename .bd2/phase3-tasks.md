# Phase 3: 删除语义与关联完整性 - 详细任务清单

## 概述
强化软删/硬删边界，确保软删实体完全隔离，硬删操作维护关联完整性，处理级联删除场景。

---

## Task 3.1: 建立删除策略清单

### 目标
明确每张表的删除策略（软删 vs 硬删），形成文档化清单。

### 实施步骤
1. 审查 `backup_schema_only.sql` 中所有表定义。
2. 分类表类型：
   - **核心业务表**（软删）：users, roles, permissions, game_accounts, strategies, logs（待定）。
   - **关联/中间表**（硬删）：users_to_roles, roles_to_permissions。
   - **配置/元数据表**（待定）：根据业务需求确定。
3. 为软删表确认删除标记字段：
   - 推荐：`deleted_at TIMESTAMP NULL`（NULL = 未删除，非 NULL = 删除时间）。
   - 备选：`is_deleted BOOLEAN DEFAULT FALSE`。
4. 创建删除策略文档（`docs/deletion-strategy.md`）：
   ```markdown
   | 表名 | 删除策略 | 删除标记字段 | 说明 |
   |------|---------|-------------|------|
   | users | 软删 | deleted_at | 保留历史数据，支持审计 |
   | roles | 软删 | deleted_at | 保留历史数据 |
   | permissions | 软删 | deleted_at | 保留历史数据 |
   | users_to_roles | 硬删 | - | 关联表，物理删除 |
   | roles_to_permissions | 硬删 | - | 关联表，物理删除 |
   ```

### 验收标准
- [ ] 文档审查：删除策略清单覆盖所有表。
- [ ] 团队评审：删除策略与业务需求一致。
- [ ] 代码审查：shared schema 中软删表包含删除标记字段。

### 依赖
- 需要 `backup_schema_only.sql` 作为参考。
- 需要业务方确认日志表删除策略（软删 vs 硬删 vs 归档）。

---

## Task 3.2: 实现软删默认过滤

### 目标
所有查询（list/detail/关联）默认过滤软删记录，除非显式查询已删除数据。

### 实施步骤
1. 创建查询谓词辅助函数（`packages/shared/src/db/predicates.ts`）：
   ```typescript
   export function notDeleted<T extends { deletedAt: any }>(table: T) {
     return isNull(table.deletedAt);
   }
   ```
2. 更新所有 service 层查询：
   ```typescript
   // 列表查询
   const users = await db.select()
     .from(usersTable)
     .where(and(
       notDeleted(usersTable),
       // ... 其他过滤条件
     ));

   // 详情查询
   const user = await db.select()
     .from(usersTable)
     .where(and(
       eq(usersTable.id, id),
       notDeleted(usersTable)
     ))
     .limit(1);

   // 关联查询
   const roles = await db.select()
     .from(rolesTable)
     .innerJoin(usersToRoles, eq(rolesTable.id, usersToRoles.roleId))
     .where(and(
       eq(usersToRoles.userId, userId),
       notDeleted(rolesTable) // 过滤软删角色
     ));
   ```
3. 创建管理员查询接口（可选）：
   - `GET /admin/users?includeDeleted=true`
   - 仅管理员权限可访问。

### 验收标准
- [ ] 代码审查：所有查询使用 `notDeleted()` 谓词。
- [ ] 集成测试：软删用户后，list/detail 均不返回。
- [ ] 集成测试：软删角色后，用户角色列表不返回该角色。
- [ ] 集成测试：管理员查询可返回已删除数据（如实现）。

### 依赖
- 依赖 Task 3.1（删除策略清单）。
- 依赖 Phase 1 Task 1.6（软删字段定义）。

---

## Task 3.3: 实现软删操作

### 目标
所有核心表的删除操作执行软删（更新删除标记），而非物理删除。

### 实施步骤
1. 更新所有核心表的 delete service：
   ```typescript
   export async function deleteUser(db: DB, id: string) {
     const result = await db.update(usersTable)
       .set({ deletedAt: new Date() })
       .where(and(
         eq(usersTable.id, parseId(id)),
         notDeleted(usersTable) // 防止重复软删
       ))
       .returning();

     if (result.length === 0) {
       throw new NotFoundError('User not found or already deleted');
     }

     return toUserResponse(result[0]);
   }
   ```
2. 确保软删幂等性：
   - 重复删除同一 ID 返回 404（或成功，需文档化一致行为）。
3. 处理软删后的关联：
   - 软删用户后，其关联的角色仍保留在 `users_to_roles` 表中（不级联删除）。
   - 查询用户角色时，通过 `notDeleted()` 过滤软删角色。

### 验收标准
- [ ] 代码审查：所有核心表 delete service 执行软删。
- [ ] 集成测试：软删后，`deleted_at` 字段非 NULL。
- [ ] 集成测试：重复软删返回一致结果（404 或成功）。
- [ ] 集成测试：软删用户后，查询用户角色仍可用（但过滤软删角色）。

### 依赖
- 依赖 Task 3.2（软删默认过滤）。

---

## Task 3.4: 实现硬删操作

### 目标
关联/中间表的删除操作执行物理删除，删除后不可查询。

### 实施步骤
1. 更新关联表的 delete service：
   ```typescript
   export async function removeUserRole(db: DB, userId: string, roleId: string) {
     const result = await db.delete(usersToRolesTable)
       .where(and(
         eq(usersToRolesTable.userId, parseId(userId)),
         eq(usersToRolesTable.roleId, parseId(roleId))
       ))
       .returning();

     if (result.length === 0) {
       throw new NotFoundError('User-role association not found');
     }

     return { success: true };
   }
   ```
2. 确保硬删幂等性：
   - 重复删除同一关联返回 404（或成功，需文档化一致行为）。

### 验收标准
- [ ] 代码审查：所有关联表 delete service 执行硬删。
- [ ] 集成测试：硬删后，记录物理删除（DB 查询返回空）。
- [ ] 集成测试：重复硬删返回一致结果（404 或成功）。

### 依赖
- 依赖 Task 3.1（删除策略清单）。

---

## Task 3.5: 处理级联删除场景

### 目标
明确级联删除策略，防止孤立关联与数据不一致。

### 实施步骤
1. 识别级联删除场景：
   - **场景 1**：软删用户时，是否级联删除其关联的角色？
     - **推荐**：不级联删除，保留关联记录，查询时通过 `notDeleted()` 过滤。
   - **场景 2**：软删角色时，是否级联删除其关联的权限？
     - **推荐**：不级联删除，保留关联记录。
   - **场景 3**：硬删关联记录时，是否检查关联实体是否存在？
     - **推荐**：删除前验证关联实体存在且未软删，否则返回 400/404。
2. 实现级联删除逻辑（如需要）：
   ```typescript
   export async function deleteUserCascade(db: DB, id: string) {
     return await db.transaction(async (tx) => {
       // 1. 软删用户
       await tx.update(usersTable)
         .set({ deletedAt: new Date() })
         .where(eq(usersTable.id, parseId(id)));

       // 2. 硬删关联（可选）
       await tx.delete(usersToRolesTable)
         .where(eq(usersToRolesTable.userId, parseId(id)));

       // 3. 其他级联操作...
     });
   }
   ```
3. 文档化级联删除策略（`docs/deletion-strategy.md`）。

### 验收标准
- [ ] 文档审查：级联删除策略明确且与业务需求一致。
- [ ] 集成测试：软删用户后，关联记录行为符合策略（保留或删除）。
- [ ] 集成测试：硬删关联时，验证关联实体存在。

### 依赖
- 依赖 Task 3.3-3.4 完成。
- 需要业务方确认级联删除策略。

---

## Task 3.6: 防止软删实体被关联

### 目标
创建/更新关联时，验证关联实体未被软删。

### 实施步骤
1. 更新关联创建 service：
   ```typescript
   export async function assignRolesToUser(db: DB, userId: string, roleIds: string[]) {
     // 1. 验证用户存在且未软删
     const user = await db.select()
       .from(usersTable)
       .where(and(
         eq(usersTable.id, parseId(userId)),
         notDeleted(usersTable)
       ))
       .limit(1);

     if (user.length === 0) {
       throw new NotFoundError('User not found or deleted');
     }

     // 2. 验证所有角色存在且未软删
     const roles = await db.select()
       .from(rolesTable)
       .where(and(
         inArray(rolesTable.id, roleIds.map(parseId)),
         notDeleted(rolesTable)
       ));

     if (roles.length !== roleIds.length) {
       throw new BadRequestError('Some roles not found or deleted');
     }

     // 3. 事务插入关联
     return await db.transaction(async (tx) => {
       const inserts = roleIds.map(roleId => ({
         userId: parseId(userId),
         roleId: parseId(roleId)
       }));
       await tx.insert(usersToRolesTable).values(inserts);
       return { success: true };
     });
   }
   ```

### 验收标准
- [ ] 代码审查：所有关联创建 service 验证实体未软删。
- [ ] 集成测试：尝试分配已软删角色，返回 400/404。
- [ ] 集成测试：尝试给已软删用户分配角色，返回 400/404。

### 依赖
- 依赖 Task 3.2-3.3 完成。

---

## Task 3.7: 编写 Phase 3 集成测试

### 目标
验证删除语义与关联完整性全链路正确性。

### 测试用例
1. **软删隔离性**：
   - 软删用户 → list 不返回 → detail 返回 404 → 关联查询不返回。
2. **硬删完整性**：
   - 硬删用户-角色关联 → 双向查询均不返回该关联。
3. **级联删除**：
   - 软删用户 → 验证关联行为符合策略（保留或删除）。
4. **防止关联软删实体**：
   - 软删角色 → 尝试分配给用户 → 返回 400/404。
5. **删除幂等性**：
   - 重复软删 → 返回一致结果（404 或成功）。
   - 重复硬删 → 返回一致结果（404 或成功）。

### 验收标准
- [ ] 所有测试用例通过。
- [ ] 测试覆盖所有删除场景（软删、硬删、级联、防关联）。

### 依赖
- 依赖 Task 3.1-3.6 全部完成。

---

## Phase 3 完成标准

- [ ] 所有 Task 3.1-3.7 验收标准通过。
- [ ] 代码审查通过（重点检查删除逻辑、关联验证）。
- [ ] 集成测试套件运行通过。
- [ ] 文档更新：`docs/deletion-strategy.md` 完整且与实现一致。

---

**预计工作量**: 4-6 天（1 名开发者）
**风险**: 高（级联删除策略需业务方确认，软删过滤逻辑复杂）
**下一阶段**: Phase 4（日志资源策略强化）
