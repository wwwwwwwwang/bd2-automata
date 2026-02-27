## Why

用户目标是将当前本地项目完成 **Git 初始化并首次提交到 GitHub**，且首提采用“最小可运行集”策略，避免把敏感信息、依赖产物和历史噪音文件带入仓库历史。当前目录尚未初始化 Git（`git status` 失败），但已存在多包工作区与 OpenSpec 资产，若无清晰边界直接提交，存在误提交 `.env`、`node_modules`、历史报告与备份 SQL 的高风险。

## Prompt Enhancement（结构化需求）

### 目标
- 在 `F:/cursor/BD2Script/bd2-automata` 初始化 Git 仓库。
- 形成首个本地提交。
- 关联并推送到用户提供的 GitHub 远程仓库。

### 技术约束
- 项目为 pnpm workspace（monorepo）结构，首提必须保留可复现所需核心配置。
- 首提必须排除高风险文件：环境与密钥、依赖与构建产物、本地 IDE 与系统文件、历史报告/备份 SQL。
- 本次不强制加入 GitHub Actions CI。

### 范围边界
- **纳入**：源码、必要配置、锁文件、必要迁移与规范资产。
- **排除**：`.env*`、`node_modules/**`、构建缓存、`.idea/.vscode`、系统杂项、历史报告、临时 HTML、`backup_schema_only.sql`（按用户选择作为首提排除项）。

### 验收标准
- 本地仓库可见初始化成功与首个提交。
- `git status` 干净，提交内容符合“最小可运行集”。
- 已配置 `origin` 并成功推送到用户指定 GitHub 仓库。
- 提交中无高风险敏感文件。

## What Changes

- 新增 `init-git-and-publish-github` 变更，定义“首次 Git 初始化与首提发布”约束集。
- 固化首提文件边界（纳入/排除）与提交流程依赖。
- 固化可验证成功判据，供后续 `/ccg:spec-plan` 与实施阶段机械执行。

## Context（研究结论摘要）

- 仓库为多目录工作区：`pnpm-workspace.yaml` + `packages/*`。
- 已存在关键可运行配置：`package.json`、`pnpm-lock.yaml`、`tsconfig.base.json`、`drizzle.config.ts`、`drizzle/`。
- 已发现高风险候选：
  - `packages/web/.env`、`packages/web/.env.development`、`packages/web/.env.production`
  - 根目录 `node_modules/`
  - 历史文档与报告（如 `.trae/documents/*`、`*_Report.md`、历史 `.html`）
  - `backup_schema_only.sql`

## Constraint Sets

### Hard Constraints（不可违反）
1. 首提必须采用“最小可运行集”，不得全量打包当前目录。
2. 必须排除以下类别：
   - 环境与密钥：`.env*`、证书/私钥类扩展名（如 `*.pem/*.key/*.p12/*.pfx/*.crt/*.cer`）
   - 依赖与构建产物：`node_modules/**`、`dist/**`、`build/**`、缓存目录
   - 本地 IDE 与系统文件：`.idea/**`、`.vscode/**`、`.DS_Store`、`Thumbs.db` 等
   - 历史报告/备份 SQL：历史调研报告、临时 HTML、`backup_schema_only.sql`
3. 首提必须保留工作区可复现最小核心：根配置 + 各 package 源码与 package.json + 必要迁移/配置。
4. 远程仓库采用“用户提供现有仓库 URL”方式，不假设或替用户创建未知仓库。
5. 本次变更不引入 CI workflow 作为首提门槛。

### Soft Constraints（偏好/约定）
1. 延续 monorepo 现状，不在初始化阶段做目录重构。
2. 保留 OpenSpec 资产（`openspec/**`）以维持规范化流程连续性。
3. 提交消息与后续流程遵循现有规范（Conventional Commit 风格）。

### Dependencies（实施依赖）
1. 用户提供可用 GitHub 仓库 URL 与推送权限。
2. `.gitignore` 需先满足排除规则，再执行 `git add`。
3. 首提前执行“纳入清单复核 + 敏感内容扫描”。
4. 本地 Git 环境可正常执行 `git init/commit/remote/push`。

### Risks（阻塞与风险）
1. `.env` 或密钥误提交导致敏感信息进入 Git 历史。
2. `node_modules` 或历史产物误提交导致仓库体积与噪音膨胀。
3. 首提遗漏关键 workspace 文件导致他人克隆后无法安装/运行。
4. 远程权限或 URL 错误导致推送失败。

## Requirements（OPSX）

### Requirement 1: 初始化与最小集首提
系统必须支持在仓库根完成 Git 初始化，并生成仅包含最小可运行集的首个提交。

#### Scenario: 最小集首提成功
- **Given** 项目根目录尚未初始化 Git
- **And** 已配置有效 `.gitignore` 排除高风险与噪音文件
- **When** 执行初始化、暂存、提交流程
- **Then** 首个提交仅包含源码与必要配置
- **And** `git status` 显示工作区干净

### Requirement 2: 敏感与噪音文件强制排除
系统必须在首提中排除环境密钥、依赖产物、本地 IDE/系统杂项、历史报告与备份 SQL。

#### Scenario: 风险文件不进入提交
- **Given** 工作区存在 `.env*`、`node_modules`、历史报告或备份 SQL
- **When** 执行首提暂存检查
- **Then** 上述文件不在提交清单中
- **And** 不出现明显密钥/令牌高危命中

### Requirement 3: GitHub 远程接入
系统必须支持使用用户提供的 GitHub 仓库 URL 配置 `origin` 并完成首次推送。

#### Scenario: 首次推送完成
- **Given** 用户提供可访问的仓库 URL
- **When** 配置 `origin` 并执行推送
- **Then** 远程仓库可见首个提交
- **And** 本地分支与远程跟踪关系建立成功

### Requirement 4: 首提不强制引入 CI
系统必须允许在不新增 GitHub Actions 工作流的前提下完成首提。

#### Scenario: 无 CI 也可通过首提验收
- **Given** 当前仓库尚未定义 `.github/workflows` 基础流程
- **When** 完成首提与推送
- **Then** 验收以“最小可运行集与风险排除”作为主判据

## Verifiable Success Criteria

1. 在仓库根可验证 Git 已初始化，且存在首个提交。
2. 首个提交文件清单包含：
   - 根级工作区与构建核心（`package.json`、`pnpm-workspace.yaml`、`pnpm-lock.yaml`、`tsconfig.base.json`、`drizzle.config.ts` 等）
   - `packages/*` 源码与各包 `package.json`
   - 需要保留的规范/迁移资产（如 `openspec/**`、`drizzle/**`）
3. 首个提交文件清单不包含用户指定强制排除类别（环境/密钥、依赖产物、IDE/系统、历史报告/备份 SQL）。
4. 已成功配置 `origin` 到用户提供仓库并完成首次推送。
5. 推送后本地工作区干净，后续可在干净环境按 workspace 方式安装依赖。

## Open Questions（进入实施前需补齐）

1. 用户提供的 GitHub 仓库 URL（精确到 `https://github.com/<owner>/<repo>.git`）。
2. 当前 `.gitignore` 是否已存在并覆盖上述排除类别（若不完整需先补齐）。
3. 根级历史文档中是否有“必须保留在首提”的例外文件名单。
