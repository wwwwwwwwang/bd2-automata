## REQ-1: 枚举单一数据源

### 场景
当开发者需要修改业务枚举值（如新增一个 email status）时，只需修改 `enums.ts` 一处，Drizzle schema 和 Zod schema 自动获得新值。

### 约束
- `enums.ts` 中每组枚举必须用 `as const` 声明
- 每组枚举必须同时导出值数组和派生联合类型
- Drizzle schema 的 `text({ enum: })` 必须引用 enums.ts 的数组，禁止内联字符串数组
- Zod schema 的 `z.enum()` 必须引用 enums.ts 的数组，禁止内联字符串数组

### PBT 属性

**P1: 枚举值一致性（Invariant Preservation）**
- 不变量：对于每组枚举，Drizzle schema 中 `enum:` 引用的数组 === Zod schema 中 `z.enum()` 引用的数组 === `enums.ts` 中定义的数组
- 伪造策略：grep 所有 `text('...', { enum:` 和 `z.enum(` 调用，验证参数均为 enums.ts 导出的常量名，无内联 `[` 字符

**P2: 类型兼容性（Round-trip）**
- 不变量：`typeof ENUM_ARRAY[number]` 产生的联合类型与原内联 `enum:` 数组推断的类型完全等价
- 伪造策略：TypeScript 编译无类型错误

---

## REQ-2: 无行为变更

### 场景
重构后所有 API 端点、数据库操作、前端表单验证的行为与重构前完全一致。

### 约束
- 不修改任何数据库列名、默认值、约束
- 不修改任何 Zod schema 的验证规则
- 不新增/删除任何导出的函数或类型（仅新增枚举导出）
- 无数据库迁移

### PBT 属性

**P3: 幂等性（Idempotency）**
- 不变量：重构前后，对于任意合法输入，API 端点返回相同响应
- 伪造策略：wrangler dry-run 编译无新增错误

---

## REQ-3: API 层常量本地化

### 场景
`EVENT_TO_STATUS` 和 `ALLOWED_FROM` 仅在 `webhookService.ts` 中使用，属于 API 层实现细节。

### 约束
- `EVENT_TO_STATUS` 和 `ALLOWED_FROM` 必须保留在 `packages/api` 内
- `packages/shared/src/constants.ts` 不包含 API 层实现细节
- shared 包只导出被多个包消费的枚举值

### PBT 属性

**P4: 作用域边界（Bounds）**
- 不变量：`packages/shared/src/` 中不存在 `EVENT_TO_STATUS` 或 `ALLOWED_FROM` 字符串
- 伪造策略：`grep -r "EVENT_TO_STATUS\|ALLOWED_FROM" packages/shared/src/` 返回空

---

## REQ-4: 命名规范

### 约束
- 值数组：SCREAMING_SNAKE_CASE（如 `TASK_STATUS`）
- 派生类型：PascalCase（如 `TaskStatus`）
- 模式：`export const FOO = [...] as const; export type Foo = typeof FOO[number];`
