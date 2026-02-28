## 1. Baseline & Preflight Gates
- [ ] 1.1 固化 in-scope canonical table list（19 张 integer PK）与 out-of-scope 列表（3 张 text PK）
- [ ] 1.2 在目标环境导出 sqlite_master DDL 快照并归档
- [ ] 1.3 执行预检 SQL（FK check / typeof(id) / MAX(id) / 超界检查）并记录结果
- [ ] 1.4 设置阻断规则：任一预检失败即停止发布

## 2. Schema & Code Policy Convergence
- [x] 2.1 统一 in-scope 表主键声明为 `integer('id', { mode: 'number' }).primaryKey()`
- [x] 2.2 移除注册流程中的手工主键写入（`id: generateSnowflakeId()`）
- [x] 2.3 移除 shared 导出中的 `generateSnowflakeId`
- [x] 2.4 删除未使用 `snowflake.ts` 实现文件
- [ ] 2.5 增加静态门禁：禁止 `generateSnowflakeId` 及 insert 手工写 `id`

## 3. Deterministic Deployment Runbook
- [ ] 3.1 按 code-first 顺序发布（先应用再验证）
- [ ] 3.2 发布后执行关键链路回归（register/login/refresh/JWT/parseId）
- [ ] 3.3 发布后重跑 FK 与 ID 边界检查，确认无回归
- [ ] 3.4 定义并演练回滚流程（不允许回滚到含 Snowflake 写入路径版本）

## 4. Test Gates (Release Blocking)
- [ ] 4.1 定义并执行静态扫描命令（Snowflake/import/手工主键赋值）
- [ ] 4.2 定义并执行数据库一致性校验命令（FK、type、max-id）
- [ ] 4.3 定义并执行关键业务回归命令（auth + FK-linked 写入）
- [ ] 4.4 要求 staging 使用近生产快照完成一次 dry-run 并记录结果

## 5. Observability & Rollback Thresholds
- [ ] 5.1 建立观测指标：注册失败率、写入失败率、PK/FK 错误数、ID headroom
- [ ] 5.2 为每个指标设置数值阈值与 owner
- [ ] 5.3 设定观察窗口与回滚触发条件
- [ ] 5.4 发布后输出观测报告并归档

## 6. PBT Properties Adoption
- [ ] 6.1 为 Monotonicity/Uniqueness 建立属性测试脚手架
- [ ] 6.2 为 Type Safety/Referential Integrity 建立属性测试数据生成器
- [ ] 6.3 为 Idempotency/Round-trip 建立属性测试断言与反例采样
- [ ] 6.4 将属性测试纳入 CI 必跑项（或 nightly + 发布前强制）
