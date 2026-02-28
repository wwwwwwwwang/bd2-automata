## ADDED Requirements

### Requirement: 全链路 ID 契约统一（自增 + safe-integer）
系统 MUST 统一 ID 语义：数据库主键由 SQLite integer 自增分配；应用层 create 不手工写 `id`；路由层统一通过 `parseId` 执行 safe-integer 校验。

#### Scenario: 数据库分配主键
- **WHEN** 创建任意业务资源
- **THEN** insert payload 中不得包含主键 `id`
- **AND** 主键值由数据库自动分配

#### Scenario: 路由参数 ID 安全校验
- **WHEN** 客户端调用资源详情、修改、删除等按 ID 接口
- **THEN** 路由参数中的 ID 必须先通过数字字符串校验
- **AND** 仅在满足 `Number.isSafeInteger` 时才进入 service

#### Scenario: 服务层使用 number 语义
- **WHEN** service 处理主键或外键
- **THEN** 使用 number 路径与 shared schema 对齐
- **AND** 不引入任何非数据库自增的主键生成链路

### Requirement: 类型一致性防护
系统 SHOULD 在 route/service/schema 层避免 ID 的多语义漂移。

#### Scenario: 非法 ID 输入
- **WHEN** path/query/body 中 ID 非数字字符串、非安全整数或越界
- **THEN** 系统返回可识别的参数校验错误（400）
