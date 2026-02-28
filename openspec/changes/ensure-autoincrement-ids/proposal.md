# 确保所有实体使用数据库自增ID

## Context

### 用户需求
检查并确保所有数据库实体使用自增ID，而非手动生成的ID（如Snowflake ID）。

### 发现的问题
通过代码库研究发现严重的ID策略不一致：

1. **Schema层（Drizzle ORM）**：20个表定义为 `integer('id').primaryKey()` - 缺少自增配置
2. **数据库层（SQLite）**：实际使用 `INTEGER PRIMARY KEY AUTOINCREMENT`
3. **应用层代码**：
   - `authService.registerUser` 手动使用 `generateSnowflakeId()` 生成用户ID
   - 其他所有服务（roleService, gameAccountService等）依赖数据库自增（不传ID）

### 核心冲突
- Snowflake生成的是64位bigint字符串
- Schema定义的是integer类型
- `parseId()` 工具要求Number安全整数（最大2^53-1）
- 大ID会导致解析失败或精度丢失

### 用户决策
采用**SQLite自增策略**：所有表使用数据库AUTOINCREMENT，移除Snowflake ID生成。

## Requirements

### REQ-1: Schema层添加自增配置
**场景**：开发者查看Drizzle schema定义时，应明确看到ID字段配置为自增

**约束**：
- 所有使用 `integer('id').primaryKey()` 的表必须添加 `{ mode: 'number' }` 配置
- 确保与SQLite的 `INTEGER PRIMARY KEY AUTOINCREMENT` 行为一致
- 不改变现有数据库结构（仅同步schema定义）

**影响范围**：
- `packages/shared/src/db/schema/*.ts` 中的20个表定义

### REQ-2: 移除手动ID生成
**场景**：用户注册时，ID应由数据库自动生成，而非应用层手动赋值

**约束**：
- 移除 `authService.registerUser` 中的 `id: generateSnowflakeId()` 赋值
- 移除 `generateSnowflakeId` 的import语句
- 保持其他insert操作不变（已经依赖数据库自增）

**影响范围**：
- `packages/api/src/services/authService.ts`

### REQ-3: 清理未使用的ID生成器
**场景**：避免未来开发者误用已废弃的ID生成函数

**约束**：
- 从 `@bd2-automata/shared` 的导出中移除 `generateSnowflakeId`
- 保留 `generateId()` 函数（用于生成token字符串，非主键ID）
- 如果 `generateSnowflakeId` 实现文件无其他用途，可删除

**影响范围**：
- `packages/shared/src/index.ts`
- `packages/shared/src/utils/id.ts`（如适用）

### REQ-4: 验证ID类型一致性
**场景**：确保所有ID相关的类型定义、解析、验证逻辑与integer自增ID兼容

**约束**：
- `parseId()` 工具应继续验证Number安全整数（符合SQLite integer范围）
- JWT payload中的 `user.id` 应为number类型
- 外键字段（userId, roleId等）应为integer类型

**影响范围**：
- `packages/api/src/utils/id.ts` - parseId函数
- `packages/api/src/services/authService.ts` - JWT生成逻辑

## Success Criteria

### SC-1: Schema定义完整性
- [ ] 所有integer主键表的schema包含明确的自增配置
- [ ] `npm run db:generate` 成功生成迁移文件且无警告
- [ ] 生成的SQL与现有数据库结构一致（AUTOINCREMENT）

### SC-2: 代码编译通过
- [ ] `npm run build` 在所有packages中成功
- [ ] 无TypeScript类型错误
- [ ] 无未使用的import警告

### SC-3: 功能验证
- [ ] 用户注册功能正常，ID由数据库自动生成
- [ ] 新创建的用户ID为递增的integer
- [ ] JWT token正常生成和验证
- [ ] 所有依赖用户ID的功能（登录、权限检查、关联查询）正常工作

### SC-4: 代码清洁度
- [ ] `generateSnowflakeId` 不再被任何代码引用
- [ ] 无残留的Snowflake ID相关注释或文档
- [ ] `generateId()` 仅用于token生成，不用于主键

## Dependencies

### 前置依赖
- 无（当前数据库已使用AUTOINCREMENT）

### 后续影响
- 如果未来需要分布式ID，需重新评估策略
- 现有数据无需迁移（已经是自增ID）

## Risks & Mitigation

### 风险1：历史大ID兼容性
**描述**：如果历史环境存在超过 JavaScript 安全整数边界的主键数据

**缓解措施**：
- 检查现有数据库中各主键表的 ID 范围
- 若发现超界数据，阻断当前发布并先完成数据治理，再继续 number 路径发布

### 风险2：外部系统依赖
**描述**：如果有外部系统依赖特定的ID格式（例如历史雪花ID的结构特征）

**缓解措施**：
- 确认无外部系统依赖 ID 内部结构
- 如有依赖，改由独立业务字段承载，不影响主键策略

### 风险3：安全整数边界
**描述**：SQLite integer 范围大于 JavaScript Number 安全整数范围（±2^53-1）

**缓解措施**：
- 保持 `parseId` 与预检脚本的 safe-integer gate
- 对 `MAX(id)` 设置发布门禁与持续观测阈值

## Implementation Notes

### 修改顺序
1. 更新schema定义（添加自增配置）
2. 移除authService中的手动ID生成
3. 清理未使用的导出
4. 运行测试验证

### 测试重点
- 用户注册流程
- ID的类型和范围
- 外键关联查询
- JWT token生成和解析
