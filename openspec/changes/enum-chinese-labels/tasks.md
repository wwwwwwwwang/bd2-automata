## 1. 实现

- [x] 1.1 `packages/shared/src/enums.ts`：为 9 组枚举新增 `XXX_LABEL` 中文映射（`Record<XxxType, string>`）
- [x] 1.2 `packages/shared/src/enums.ts`：新增 `toOptions` 辅助函数 + 9 组 `XXX_OPTIONS` 数组（`{ label, value }[]`）

## 2. 验证

- [x] 2.1 wrangler dry-run 无新增编译错误
- [x] 2.2 所有 LABEL 映射类型为 `Record<XxxType, string>`，TypeScript 保证 key 完整性
