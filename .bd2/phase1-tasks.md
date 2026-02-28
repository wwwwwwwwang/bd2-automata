# Phase 1: ID 与 Schema 基线 - 详细任务清单

## 概述
建立 **SQLite 自增 + number safe-integer gate** 基线，统一 schema 与 service 的 ID 处理；不采用 Snowflake，不采用 bigint/string codec。

---

## Task 1.1: 固化 ID 策略基线

### 目标
明确并落地统一策略：数据库分配主键，应用层不手工写 `id`。

### 实施步骤
1. 在 shared schema 中统一 integer 主键声明（`integer('id', { mode: 'number' }).primaryKey()`）。
2. 检查 create 流程，确保 insert payload 不包含主键 `id`。
3. 清理历史 Snowflake 相关引用与导出残留。

### 验收标准
- [ ] 代码审查：create 路径无手工 `id` 赋值。
- [ ] 静态扫描：无 `generateSnowflakeId` 引用/调用。
- [ ] 回归验证：新增记录 ID 由 DB 自动分配。

---

## Task 1.2: 统一 parseId safe-integer 校验

### 目标
保持 API 路由 ID 在 number 路径下的安全边界。

### 实施步骤
1. 保持 `parseId` 逻辑：数字字符串校验 + `Number.isSafeInteger`。
2. 非法 ID 统一返回 400。
3. 在路由层统一复用 `parseId`。

### 验收标准
- [ ] 单元测试：合法 ID 通过、非法 ID 拒绝。
- [ ] 集成测试：非法 path id 返回 400。

---

## Task 1.3: 对齐 shared schema 与 SQL 字段命名

### 目标
消除 DTO 与表字段命名不一致风险。

### 实施步骤
1. 对比 `packages/shared/src/db/schema/**` 与 `backup_schema_only.sql`。
2. 识别并修正命名漂移字段。
3. 在 service 层保持显式映射。

### 验收标准
- [ ] create/update 无 unknown column 问题。
- [ ] 字段映射规则可追踪。

---

## Task 1.4: 路由层 ID 参数统一

### 目标
所有 path/query/body 的业务 ID 走统一验证路径。

### 实施步骤
1. 路由参数先做 string 数字校验。
2. 统一调用 `parseId` 转为安全整数。
3. 错误信息统一格式。

### 验收标准
- [ ] 非法 ID 请求均返回 400。
- [ ] 合法 ID 请求可正常进入 service。

---

## Task 1.5: 软删字段与默认过滤基线

### 目标
明确软删表默认查询行为。

### 实施步骤
1. 核心表补齐软删标记字段定义（按现有 schema）。
2. list/detail 查询默认过滤软删数据。
3. delete 行为按表策略区分软删/硬删。

### 验收标准
- [ ] 软删后 list/detail 不再返回该记录。
- [ ] 硬删后记录不可查。

---

## Task 1.6: Phase 1 集成验证

### 目标
验证 ID 策略与 schema 基线可用。

### 测试用例
1. 新增记录后主键由 DB 自动分配。
2. 非法 ID（空、非数字、小数、超界）被拒绝。
3. 关键链路（register/login/refresh/JWT/parseId）行为一致。

### 验收标准
- [ ] 所有用例通过。
- [ ] 无 Snowflake 相关回归。

---

## Phase 1 完成标准

- [ ] 所有 Task 1.1-1.6 验收通过。
- [ ] 文档与实现一致：SQLite 自增 + safe-integer gate。
- [ ] 无 bigint/string codec 相关实现依赖。
