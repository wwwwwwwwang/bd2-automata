# Phase 1: ID 与 Schema 基线 - 详细任务清单

## 概述
建立 string-first ID 处理基线，统一 DTO/表字段命名，确保所有 create 流程注入 Snowflake ID。

> **更新 (2025-01-31)**: Snowflake ID 生成器原实现已移除（未被实际代码使用）。Task 1.1 标记为"待实施"状态。

---

## Task 1.1: 创建 Snowflake ID 生成器

> **状态**: ⚠️ 待实施 - 原实现已移除（未被使用）

### 目标
实现集中式 `generateId()` 辅助函数，供所有 create service 调用。

### 实施步骤
1. 在 `packages/shared/src/utils/` 创建 `snowflake.ts`。
2. 实现 Snowflake 算法：
   - 时间戳（41 位）：毫秒级，自定义 epoch。
   - Worker ID（10 位）：支持 1024 个 worker（当前单实例可硬编码为 0）。
   - 序列号（12 位）：同一毫秒内递增，支持 4096 个 ID。
3. 处理边界情况：
   - 时钟回拨：拒绝生成并抛出错误（或等待时钟追上）。
   - 序列号溢出：等待下一毫秒。
4. 导出 `generateId(): string` 函数（返回 string 形式的 64 位整数）。

### 验收标准
- [ ] 单元测试：连续生成 10000 个 ID，验证唯一性与单调性。
- [ ] 单元测试：模拟时钟回拨，验证错误抛出。
- [ ] 单元测试：模拟序列号溢出，验证等待逻辑。
- [ ] 性能测试：单线程生成 100 万 ID < 10 秒。

### 依赖
- 无外部依赖，可立即开始。

### 备注
- 原有实现位于 git 历史中，可在需要时恢复参考

---

## Task 1.2: 重构 parseId 实现

### 目标
移除 `Number()` 转换，改为 string 验证 + DB codec。

### 实施步骤
1. 定位现有 `parseId` 函数（可能在 `packages/shared/src/utils/` 或 route 层）。
2. 移除 `Number(id)` 与 `Number.isSafeInteger()` 检查。
3. 实现新逻辑：
   - 验证 `id` 为 string 且匹配 `/^\d+$/`。
   - 验证长度 ≤ 19（64 位上限：`9223372036854775807`）。
   - 返回原始 string（不转换为 number）。
4. 创建 DB codec 辅助函数（如需要）：
   - `stringToBigInt(id: string): bigint` - 用于 DB 查询。
   - `bigIntToString(id: bigint): string` - 用于响应序列化。

### 验收标准
- [ ] 单元测试：合法 ID（`"123"`, `"9223372036854775807"`）通过验证。
- [ ] 单元测试：非法 ID（`""`, `"abc"`, `"123.45"`, `"-1"`, `"99999999999999999999"`）被拒绝。
- [ ] 集成测试：route 层接收非法 ID 返回 400 + 明确错误信息。

### 依赖
- 无，可与 Task 1.1 并行。

---

## Task 1.3: 对齐 shared schema 与 SQL 字段命名

### 目标
消除 DTO 与表字段命名不一致（如 `maxGameAccounts` vs `maxAccounts`）。

### 实施步骤
1. 对比 `packages/shared/src/db/schema/**` 与 `backup_schema_only.sql`。
2. 识别命名差异字段（如 `users` 表的 `maxGameAccounts` vs `max_accounts`）。
3. 统一命名策略：
   - **推荐**：以 SQL 表字段为准（`max_accounts`），DTO 使用 camelCase（`maxAccounts`）。
   - 在 service 层显式映射 DTO ↔ entity。
4. 更新 shared schema 定义（Drizzle schema）。
5. 更新所有 service 层的 insert/update 映射逻辑。

### 验收标准
- [ ] 代码审查：所有 DTO 字段与 SQL 表字段一一对应（通过命名映射）。
- [ ] 集成测试：create/update 操作不抛出 "unknown column" 错误。
- [ ] 文档：在 `design.md` 中记录命名映射规则。

### 依赖
- 需要 `backup_schema_only.sql` 作为参考。

---

## Task 1.4: 所有 create service 注入 Snowflake ID

### 目标
确保所有资源创建流程使用 `generateId()` 而非依赖 DB 自增。

### 实施步骤
1. 识别所有 create service 函数：
   - `createUser`
   - `createRole`
   - `createPermission`
   - `createLog`（如适用）
   - 其他资源的 create 方法。
2. 在每个 create service 开头调用 `generateId()` 生成 ID。
3. 将生成的 ID 注入到 insert payload 中（显式设置 `id` 字段）。
4. 移除依赖 DB 自增的逻辑（如 `RETURNING id` 后再查询）。

### 验收标准
- [ ] 代码审查：所有 create service 显式调用 `generateId()`。
- [ ] 集成测试：创建资源后，返回的 ID 为 Snowflake 格式（19 位数字字符串）。
- [ ] 集成测试：并发创建 100 个资源，验证 ID 唯一性。

### 依赖
- 依赖 Task 1.1（`generateId()` 函数）。

---

## Task 1.5: route 层 ID 参数统一为 string 验证

### 目标
所有 route 层的 path/query/body ID 参数使用 zod string 验证。

### 实施步骤
1. 识别所有 route 定义中的 ID 参数：
   - Path 参数：`/users/:id`
   - Query 参数：`?userId=123`
   - Body 参数：`{ roleId: "123" }`
2. 统一 zod schema：
   ```typescript
   const idSchema = z.string().regex(/^\d+$/, "ID must be numeric string").max(19);
   ```
3. 替换所有 `z.number()` 或 `z.string().transform(Number)` 为 `idSchema`。
4. 更新错误处理：返回 400 + 明确字段错误信息。

### 验收标准
- [ ] 代码审查：所有 route ID 参数使用统一 `idSchema`。
- [ ] 契约测试：发送非法 ID（`"abc"`, `"123.45"`）返回 400。
- [ ] 契约测试：发送合法 ID（`"123"`）正常处理。

### 依赖
- 依赖 Task 1.2（`parseId` 重构）。

---

## Task 1.6: 补齐软删字段定义

### 目标
为核心表（users/roles/permissions）补齐软删标记字段。

### 实施步骤
1. 确认 `backup_schema_only.sql` 中软删字段定义（`deleted_at` 或 `is_deleted`）。
2. 更新 shared schema（Drizzle）：
   - 添加 `deletedAt: timestamp` 或 `isDeleted: boolean` 字段。
   - 设置默认值（`NULL` 或 `false`）。
3. 更新 service 层默认查询谓词：
   - list/detail 查询自动添加 `WHERE deleted_at IS NULL` 或 `WHERE is_deleted = false`。
4. 更新 delete service：
   - 软删表：执行 `UPDATE SET deleted_at = NOW()` 或 `SET is_deleted = true`。
   - 硬删表：执行 `DELETE FROM`。

### 验收标准
- [ ] 代码审查：核心表 schema 包含软删字段。
- [ ] 集成测试：软删后，list 查询不返回该记录。
- [ ] 集成测试：软删后，detail 查询返回 404。
- [ ] 集成测试：硬删后，记录物理删除。

### 依赖
- 需要 `backup_schema_only.sql` 作为参考。

---

## Task 1.7: 编写 Phase 1 集成测试

### 目标
验证 ID 生成、验证、注入全链路正确性。

### 测试用例
1. **ID 生成唯一性**：并发创建 1000 个用户，验证 ID 无重复。
2. **ID 格式一致性**：创建资源后，响应 ID 为 19 位数字字符串。
3. **ID 验证边界**：发送非法 ID（空、非数字、超长、负数）返回 400。
4. **软删过滤**：软删用户后，list 不返回、detail 返回 404。
5. **字段映射正确性**：创建用户时，`maxAccounts` 正确写入 DB `max_accounts` 字段。

### 验收标准
- [ ] 所有测试用例通过。
- [ ] 测试覆盖率 ≥ 80%（ID 相关代码路径）。

### 依赖
- 依赖 Task 1.1-1.6 全部完成。

---

## Phase 1 完成标准

- [ ] 所有 Task 1.1-1.7 验收标准通过。
- [ ] 代码审查通过（重点检查 ID 处理逻辑、字段映射）。
- [ ] 集成测试套件运行通过。
- [ ] 文档更新：在 `design.md` 中记录 ID 策略与字段映射规则。

---

**预计工作量**: 3-5 天（1 名开发者）
**风险**: 中等（主要风险在历史数据迁移与并发测试）
**下一阶段**: Phase 2（CRUD 契约规范化）
