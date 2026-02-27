## Why

`shared/src/enums.ts` 已集中定义 9 组业务枚举值，但缺少中文标签。前端渲染表格列、状态标签、下拉选项时需要中文显示，当前各视图文件中硬编码 `xxxMap` 对象（如 `statusMap`），存在大量重复且与枚举定义脱节。

## What Changes

- 在 `shared/src/enums.ts` 中为每组枚举新增 `LABEL` 映射和 `OPTIONS` 数组。
- 模式：
  ```ts
  export const TASK_STATUS_LABEL: Record<TaskStatus, string> = {
    pending: '待处理', in_progress: '进行中', ...
  };
  export const TASK_STATUS_OPTIONS = TASK_STATUS.map(v => ({ label: TASK_STATUS_LABEL[v], value: v }));
  ```
- `OPTIONS` 数组格式为 `{ label: string, value: string }[]`，直接兼容 Naive UI 的 Select/Radio/Checkbox 组件。

## Capabilities

### New Capabilities
- `enum-labels`: 每组枚举提供 `XXX_LABEL` 中文映射 + `XXX_OPTIONS` 选项数组。

### Modified Capabilities
- `shared-enums`: 从纯值定义扩展为值 + 标签 + 选项三件套。

## Impact

- 受影响文件：
  - `packages/shared/src/enums.ts` — 新增 9 组 LABEL 映射 + 9 组 OPTIONS 数组
- 不涉及：
  - 前端视图文件中已有的 `xxxMap` 硬编码（后续可逐步替换，不在本次范围）
  - Drizzle/Zod schema（不受影响）
  - API 路由/服务（不受影响）
- 风险：无，纯新增导出

## Constraints

- 命名规范：`XXX_LABEL`（SCREAMING_CASE）、`XXX_OPTIONS`（SCREAMING_CASE）
- LABEL 类型：`Record<XxxType, string>`，确保每个枚举值都有对应标签
- OPTIONS 格式：`{ label: string, value: string }[]`，兼容 Naive UI
- 标签语言：中文，与项目现有硬编码风格一致
- 不引入 i18n 框架

## Success Criteria

1. 每组枚举都有 `XXX_LABEL` 映射，类型为 `Record<XxxType, string>`
2. 每组枚举都有 `XXX_OPTIONS` 数组，格式为 `{ label: string, value: string }[]`
3. `XXX_LABEL` 的 key 与枚举值完全一致（TypeScript 类型保证）
4. 从 `@bd2-automata/shared` 可直接导入使用
