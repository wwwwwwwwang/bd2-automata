# Spec Plan: implement-api-crud-fullstack

## 1. 变更范围与目标

### 1.1 核心目标
- 统一 ID 处理策略：API 层全面采用 **string** 表示业务 ID，后端使用 bigint/string codec 与 DB 交互，杜绝 JS `number` 精度丢失。
- 规范 CRUD 契约：列表响应 `{items, meta}`，详情/增改删响应单对象；所有资源端点行为一致。
- 明确删除语义：核心表（users/roles/permissions）软删除，关联表（users_to_roles/roles_to_permissions）硬删除；查询默认过滤软删数据。
- 强化日志策略：logs 资源仅支持查询与删除，POST/PUT/PATCH 明确拒绝并返回稳定错误码。

### 1.2 影响范围
- **Backend**: `apps/backend/src/routes/*`, `apps/backend/src/services/*`, `packages/shared/src/schema/*`, ID 生成与解析工具。
- **Frontend**: `apps/frontend/src/api/*`, `apps/frontend/src/types/*`, 组件中的 ID 处理逻辑。
- **Database**: 无 schema 变更（保持 SQLite INTEGER），但需确保所有 create 流程注入 Snowflake ID。
- **Tests**: 新增契约测试、集成测试、边界场景测试。

---

## 2. 技术风险与缓解

### 2.1 高风险项
| 风险 | 严重性 | 影响 | 缓解措施 |
|------|--------|------|----------|
| 64 位 ID 精度丢失 | **高** | 错误查询、join 失败、授权检查不确定 | API/service 边界禁用 JS `number`，使用 string + bigint codec |
| Snowflake ID 注入路径不全 | **高** | 混合主键来源（rowid + Snowflake），排序与互操作性问题 | 集中 ID 生成辅助函数，所有 create service 强制使用并测试 |
| DTO/表字段漂移 | 中 | 运行时 insert/update 失败或业务意图丢失 | 分离传输 DTO 与持久化 DTO，显式映射 |
| 软删/硬删边界泄漏 | 中 | 已删除实体仍在关联读取或授权图中可见 | 统一应用软删谓词，包括 join/关联查询 |
| 响应契约不一致 | 中 | 前端补丁化、集成脆弱 | 强制共享响应类型 + 端点级契约测试 |
| 日志硬删与审计冲突 | 中 | 丢失取证可追溯性 | 生产前定义保留策略（硬删 vs 归档 vs 软删） |

### 2.2 架构选项
- **推荐（A）**: SQLite INTEGER 存储 + 后端 bigint-aware codec（最小 schema 变更，性能好，需严格纪律避免意外 number 转换）。
- 备选（B）: 所有业务 ID 存为 TEXT（无 JS 精度风险，但迁移成本高、数值排序弱化）。
- 备选（C）: ULID/UUID 外部 ID + 内部数值键（超出本次变更范围）。

---

## 3. 实施路径（5 阶段）

### Phase 1: ID 与 Schema 基线
**目标**: 建立 string-first ID 处理基线，统一 DTO/表字段命名。

> **更新 (2025-01-31)**: Snowflake ID 生成器原实现已移除（未被实际代码使用）。Action 2 标记为"待实施"状态。

**Actions**:
1. 替换 `parseId` 实现：移除 `Number()` 转换，改为 string 验证（regex/length）+ DB codec（`string <-> bigint/text`）。
2. ⚠️ **待实施**: 集中 Snowflake ID 生成：创建 `generateId()` 辅助函数，所有 user/role/permission/log create service 调用。
3. 对齐 shared schema 与 DTO 命名：`maxGameAccounts` vs `maxAccounts`，移除 insert/update payload 中的非列字段。
4. 验证：单元测试覆盖 ID 验证边界（非数字、超长、负数）；集成测试确认所有 create 流程注入 Snowflake ID。

**Gap 观察**:
- 现有 `parseId` 使用 `Number` + safe-integer 检查，与 64 位策略冲突。
- Create 流程未一致注入 Snowflake ID。
- Snowflake ID 生成器需要重新实现（原实现已从代码库移除）。

---

### Phase 2: CRUD 契约规范化
**目标**: 统一所有资源端点的请求/响应格式。

**Actions**:
1. 标准化响应形状：列表 `{ items: T[], meta: { total, page?, limit? } }`，详情/增改删返回单对象 `T`。
2. 所有对外 ID 序列化为 `string`：route/service 响应映射层强制转换。
3. 严格 zod 验证：path/query/body ID 均为 string 形式的数值 ID（`z.string().regex(/^\d+$/)`）。
4. 验证：契约测试覆盖所有端点的响应格式；类型测试确认 ID 类型为 `string`。

**Gap 观察**:
- 返回形状不一致（部分 create 方法可能返回数组 vs 单对象）。
- 部分 service 签名仍允许 `string | number` ID。

---

### Phase 3: 删除语义与关联完整性
**目标**: 落地软删/硬删策略，确保关联读取不泄漏已删除实体。

**Actions**:
1. 保持核心表软删（`users`, `roles`, `permissions`）、关联表硬删（`users_to_roles`, `roles_to_permissions`）。
2. 默认过滤软删行：list/detail 及关联读取均应用 `isDeleted = false` 谓词。
3. 事务包裹关联分配：验证被引用实体未软删后再链接。
4. 验证：集成测试覆盖软删过滤、硬删关联、软删实体不可再关联。

**Gap 观察**:
- 关联读取可能返回已软删实体，除非显式过滤。

---

### Phase 4: 日志资源策略强化
**目标**: 明确 logs 资源的只读特性，拒绝写操作。

**Actions**:
1. 保留 GET（查询）与 DELETE（删除）端点。
2. POST/PUT/PATCH 明确拒绝，返回稳定错误码（如 `405 Method Not Allowed` 或自定义业务码）。
3. 如日志升级为审计级，优先软删或归档策略而非物理删除。
4. 验证：端点测试确认写操作被拒绝；保留策略文档化。

**Gap 观察**:
- 查询/删除行为已存在，但保留/审计影响需显式策略。

---

### Phase 5: 验证与回归保护
**目标**: 补齐测试覆盖，防止未来回归。

**Actions**:
1. 契约测试：所有端点 ID-as-string 行为。
2. 集成测试：软删过滤、硬删关联、日志写拒绝。
3. 迁移/回填检查：历史 ID 与关联一致性。
4. 边界场景测试：非法 ID、时钟回拨、并发更新、分页边界、删除幂等性。

---

## 4. 关键边界场景与失败模式

| 场景 | 失败模式 | 处理策略 |
|------|----------|----------|
| 客户端发送非数字/超长 ID 字符串 | 400 验证错误或溢出 | route 层严格 regex/length 检查，禁止 Number 强制转换 |
| Snowflake 时钟回拨 | 重复或非单调 ID | 生成器逻辑防护回拨与序列溢出，增加碰撞监控 |
| 并发角色/权限分配更新 | 删后插竞争导致更新丢失 | 事务 + 幂等语义 + 可选乐观并发令牌 |
| 软删角色仍在关联表中链接 | 权限图返回过期/无效权限 | 关联读取按链接实体 `isDeleted = false` 过滤 |
| Create/update payload 含非列字段 | insert/update 运行时错误或静默忽略 | 显式 DTO-to-entity mapper，拒绝未知字段 |
| 重复调用 delete 端点 | 第二次返回 404，前端可能视为致命错误 | 文档化幂等语义（404 vs success-noop）并保持一致 |
| 分页边界（offset 超出总数） | 空结果或错误 | 返回空 items + 正确 meta，不抛错 |
| 日志写操作被未来改动误放开 | 审计数据污染 | 端点级测试 + 代码审查强制策略 |

---

## 5. PBT 属性抽取

### 5.1 ID 处理属性
- **往返一致性**: `parseId(serializeId(id)) === id`（string 域）。
- **单调性**: 同一时间窗口内生成的 Snowflake ID 严格递增（时间戳部分单调，序列号递增）。
- **边界安全**: 任意非数字/超长/负数/浮点输入均被拒绝，返回 400 而非运行时异常。
- **唯一性**: 任意两次 `generateId()` 调用返回不同 ID（除非序列号溢出，需监控）。
- **格式不变性**: 所有 API 响应中的 ID 字段满足 `/^\d+$/` 且长度 ≤ 19（64 位上限）。

### 5.2 CRUD 契约属性
- **响应形状不变性**:
  - 所有列表端点返回 `{items: T[], meta: {total: number, page?: number, limit?: number}}`。
  - 所有详情/增改删端点返回单对象 `T`（非数组、非嵌套 `{data: T}`）。
- **ID 类型不变性**: 所有响应中的 ID 字段（`id`, `userId`, `roleId`, `permissionId` 等）类型为 `string`。
- **分页一致性**:
  - `page=1, limit=10` 返回前 10 条。
  - `page=N, limit=L` 返回 `items.length ≤ L`。
  - `meta.total` 为总记录数（不受分页影响）。
  - `offset 超出总数` 返回空 `items` + 正确 `meta`，不抛错。

### 5.3 删除语义属性
- **软删隔离性**:
  - 软删实体不出现在任何默认查询结果（list/detail/关联）中。
  - 软删后再次 GET 该 ID 返回 404（或明确的 "已删除" 错误）。
  - 软删实体不可再被关联（如已删除角色不可分配给用户）。
- **关联完整性**:
  - 硬删关联表记录后，双向关联查询均不返回该关联。
  - 删除用户-角色关联后，`GET /users/:id/roles` 和 `GET /roles/:id/users` 均不包含该关联。
- **删除幂等性**:
  - 软删：重复删除同一 ID 返回成功（或 404，需文档化一致行为）。
  - 硬删：重复删除同一 ID 返回 404（或成功，需文档化一致行为）。

### 5.4 日志策略属性
- **写拒绝不变性**: POST/PUT/PATCH `/logs` 端点始终返回 `405 Method Not Allowed`（或自定义业务码），不受其他变更影响。
- **查询可用性**: GET `/logs` 支持分页与过滤，返回格式符合 5.2 契约属性。
- **删除可用性**: DELETE `/logs/:id` 可执行（按保留策略），返回格式符合 5.2 契约属性。

### 5.5 并发与事务属性
- **关联分配原子性**: 批量分配用户-角色关联时，要么全部成功，要么全部失败（事务包裹）。
- **软删竞争安全**: 并发删除同一实体时，仅一次标记生效，其他返回一致结果（幂等）。
- **Snowflake ID 无碰撞**: 并发生成 ID 时，不产生重复（序列号递增 + worker ID 隔离）。

### 5.6 边界与错误属性
- **非法 ID 拒绝**:
  - 空字符串、`"abc"`, `"123.45"`, `"-1"`, `"999999999999999999999"` 均返回 400。
- **缺失必填字段拒绝**: create/update 缺少必填字段时返回 400 + 明确字段错误信息。
- **外键约束违反**: 关联不存在的 ID 时返回 400/404 + 明确错误信息（如 "角色 ID 不存在"）。
- **重复唯一键**: 创建重复 username/email 时返回 409 + 明确冲突字段信息。

---

## 6. Tasks 与 Design 收敛

### 6.1 与现有 tasks.md 对齐

**现有任务结构**（5 大块）:
1. Schema 对齐（shared + SQL）
2. 后端 API（首批资源：用户/角色/权限）
3. 日志资源策略收敛
4. 前端契约接入（后置阶段）
5. 验收与回归

**映射到 5 阶段实施路径**:
- **Phase 1（ID 与 Schema 基线）** → tasks 1.1-1.4 + 2.5
- **Phase 2（CRUD 契约规范化）** → tasks 2.1-2.4
- **Phase 3（删除语义与关联完整性）** → tasks 1.3-1.4 + 验收 5.3
- **Phase 4（日志资源策略强化）** → tasks 3.1-3.3 + 验收 5.4
- **Phase 5（验证与回归保护）** → tasks 5.1-5.4 + 前端联调 4.1-4.3

**一致性确认**:
- ✅ ID 策略一致：DB BIGINT、后端雪花生成、API/前端 string。
- ✅ 删除策略一致：核心表软删、关联表硬删。
- ✅ 日志策略一致：仅查询+删除，拒绝新增/修改。
- ✅ 分页契约一致：`page/limit` 输入，`items + meta` 输出。

### 6.2 与现有 design.md 对齐

**设计决策点确认**:
- **架构选项**: 采用推荐方案 A（SQLite INTEGER/BIGINT + bigint codec），与 design.md "DB 层 BIGINT(64位)" 一致。
- **响应格式**: 列表 `{items, meta}`，详情/增改删单对象，与 design.md "分页约定" 一致。
- **删除策略**: 核心表软删（`deleted_at`/`is_deleted`），关联表硬删，与 design.md "删除语义按表区分" 一致。
- **日志策略**: 仅查删，写拒绝，与 design.md "日志资源策略" 一致。

**风险缓解对齐**:
- design.md 提到的 3 大风险（历史 ID 混用、软删/硬删边界、日志写入污染）均已纳入本文档 2.1 技术风险表。

### 6.3 待明确任务（补充）
- [ ] 确认 Snowflake ID 生成器配置（worker ID、datacenter ID、时钟回拨策略）。
- [ ] 确认日志保留策略（硬删 vs 软删 vs 归档）→ 当前 design.md 倾向"按策略删除"，需明确具体策略。
- [ ] 确认前端 ID 处理迁移路径（是否需要兼容层）→ tasks 4.1-4.2 已规划，需确认是否需要渐进式迁移。
- [ ] 确认测试覆盖率目标（契约测试、集成测试、边界测试）→ tasks 5.1-5.4 已规划验收，需补充具体测试用例清单。

### 6.4 冲突消解
- **无冲突**: spec-plan、tasks.md、design.md 三者在核心策略（ID、删除、日志、分页）上完全一致。
- **补充关系**: spec-plan 提供更细粒度的技术风险、边界场景、PBT 属性；tasks.md 提供可执行任务清单；design.md 提供架构决策与验收标准。

---

## 7. 下一步行动

### 7.1 立即可执行
1. **启动 Phase 1 实施**:
   - 创建 `generateId()` 辅助函数（Snowflake ID 生成器）。
   - 重构 `parseId()` 实现（移除 `Number()` 转换，改为 string 验证 + DB codec）。
   - 对齐 shared schema 与 `backup_schema_only.sql` 字段命名（`maxGameAccounts` vs `maxAccounts`）。
   - 单元测试覆盖 ID 验证边界（非数字、超长、负数、浮点）。
   - 集成测试确认所有 create 流程注入 Snowflake ID。

2. **补充测试用例清单**:
   - 基于 5.1-5.6 PBT 属性，编写具体测试用例（契约测试、集成测试、边界测试）。
   - 优先覆盖高风险场景（64 位精度、软删过滤、关联完整性）。

### 7.2 待外部输入
1. **Snowflake ID 生成器配置**:
   - 确认 worker ID 与 datacenter ID 分配策略（单实例 vs 多实例）。
   - 确认时钟回拨处理策略（拒绝 vs 等待 vs 序列号补偿）。
   - 确认序列号溢出监控与告警机制。

2. **日志保留策略**:
   - 确认生产环境日志删除策略（硬删 vs 软删 vs 归档到冷存储）。
   - 确认审计合规要求（保留期限、不可篡改性）。

3. **前端迁移路径**:
   - 确认是否需要兼容层（渐进式迁移 vs 一次性切换）。
   - 确认前端 ID 处理工具函数（如 `parseId`, `formatId`）是否需要统一封装。

### 7.3 待补充分析
1. **Gemini 前端分析**:
   - 待 gemini 通道恢复后，运行前端视角分析（`apps/frontend/src/**`）。
   - 重点关注：ID 处理逻辑、API 调用契约、分页组件、删除操作 UI 反馈。
   - 合并到本文档 Section 1.2（影响范围）与 Section 4（边界场景）。

2. **历史数据一致性检查**:
   - 编写脚本检查现有 DB 中是否存在非 Snowflake ID（如 SQLite 自增 rowid）。
   - 确认关联表外键完整性（是否存在孤立关联）。
   - 确认软删标记一致性（`deleted_at` vs `is_deleted` 字段是否同步）。

### 7.4 文档维护
1. **同步更新 openspec 文件**:
   - 将本文档关键决策同步到 `design.md`（如 PBT 属性、边界场景）。
   - 将细化任务同步到 `tasks.md`（如 Phase 1 子任务拆解）。
   - 保持三者一致性（spec-plan 为主文档，design.md 为架构决策，tasks.md 为执行清单）。

2. **版本控制**:
   - 每次重大变更后更新文档版本号与最后更新时间。
   - 记录关键决策变更历史（如架构选项调整、风险缓解策略变更）。

---

**文档版本**: v0.2
**最后更新**: 2024 - 基于 codex 后端分析 + tasks/design 文档对齐
**状态**: ✅ PBT 属性已补充，✅ tasks/design 已对齐，⏳ 待 gemini 前端分析
**下一里程碑**: Phase 1 实施（ID 与 Schema 基线）
