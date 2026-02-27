## ADDED Requirements

### Requirement: 全链路 ID 契约统一
系统 MUST 统一 ID 语义：数据库字段使用 `BIGINT(64位)`，由后端雪花算法生成；API 输入输出与前端处理统一使用 `string`。

#### Scenario: 后端生成主键
- **WHEN** 创建任意业务资源
- **THEN** 主键由后端雪花算法生成
- **AND** 持久化类型为 BIGINT(64位)

#### Scenario: API 入参与出参 ID 为 string
- **WHEN** 客户端调用资源详情、修改、删除等按 ID 接口
- **THEN** 路由参数中的 ID 按 string 语义处理
- **AND** 响应中的 ID 字段按 string 语义返回

#### Scenario: 前端统一 string 处理
- **WHEN** 前端读取或提交 ID 字段
- **THEN** 前端在状态与请求层统一按 string 处理
- **AND** 不依赖 number 类型进行 ID 计算

### Requirement: 类型漂移防护
系统 SHOULD 在 DTO/schema 层避免 ID 的 number/string 混用。

#### Scenario: 非法 ID 类型输入
- **WHEN** 请求体或参数中的 ID 不符合约定 string 语义
- **THEN** 系统返回可识别的参数校验错误
