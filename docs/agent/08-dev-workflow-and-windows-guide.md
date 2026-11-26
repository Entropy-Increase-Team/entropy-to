# 08 — 研发工作流、测试体系、提交规范与 Windows 本地开发避坑指南

本章汇总在 `entropy-to` 仓库日常开发、编译、测试、提交 PR 的完整工程规范，并特别整理了在 **Windows 原生环境**下开发此仓库的关键注意事项与解决方案。

---

## 1. 高频研发命令速查

| 场景 | 命令 | 说明 |
| --- | --- | --- |
| **安装依赖** | `pnpm i` | 根 `preinstall` 强制校验使用 `pnpm`（`^12.0.0`），自动触发 `sync-preset.js` 同步连接器模板 |
| **全仓预构建（必记）** | `pnpm prepack` | 依次构建 `toolkit`、`phrases*`、`schemas`（含 SQL 代码生成）、`cli`、`elements` 并生成 Console 类型；跨包类型报错时首选执行 |
| **本地启动开发环境** | `pnpm dev` | 先执行 `pnpm -r prepack`，再并行启动 `core` 与各前端 Vite watch（Cloud 模拟模式用 `pnpm dev:cloud`） |
| **全量生产构建** | `pnpm ci:build` | 等价于 `pnpm -r build` |
| **初始化本地数据库** | `pnpm cli db seed -- --swe` | 创建数据库、表、RLS 策略与初始种子数据 |
| **链接本地官方连接器** | `pnpm cli connector link -p .` | 将 `packages/connectors/connector-*` 链接至 `packages/core/connectors` |
| **部署未发版数据库迁移** | `pnpm alteration deploy next` | 执行 `packages/schemas/alterations/next-*.ts` 迁移脚本 |
| **指定包类型检查** | `pnpm --filter @logto/core check` | 全仓检查使用 `pnpm -r check`（需先 `pnpm prepack`） |
| **指定包 Lint / 样式检查** | `pnpm --filter @logto/core lint` | 全仓使用 `pnpm ci:lint` 与 `pnpm ci:stylelint` |
| **运行单包单元测试** | `pnpm --filter @logto/core test`<br/>`pnpm --filter @logto/schemas test` | `core`、`console`、`experience`、`account` 使用 Jest；`schemas`、`cli`、`job-queue`、`toolkit`、`connectors` 使用 Vitest |
| **数据库迁移双库比对测试** | `node .scripts/compare-database.test.js` | 验证数据库结构比对脚本自身逻辑 |
| **运行集成测试套件** | `./.scripts/integration/run.sh api` | 支持 `api`、`experience`、`console`、`well-known`（依赖 Docker Compose 启动 PG + Redis + S3Mock） |

---

## 2. Git 分支、Commitlint、Changeset 与 PR 规范

### 2.1 分支命名与 PR 规范 (`AGENTS.md`)
- **分支名**：`<author-github-username>-<kebab-case-words>`，全小写连字符，**严禁包含 `/` 斜杠**（例如 `dnyo-fix-saml-audience-check`）。
- **PR 描述**：遵循 `logto-io/.github/PULL_REQUEST_TEMPLATE.md` 填齐所有章节；**严禁在 PR 描述中提及 `isDevFeaturesEnabled` 等特性开关细节**；`Testing` 章节仅允许填写 `Tested locally`、`Unit tests`、`Integration tests` 或 `N/A`。

### 2.2 Commit Message 规范 (`commitlint.config.ts`)
格式：`<type>(<scope>): <subject>`（正文每行不超过 110 字符，禁止跳过 `.husky` Git Hooks）：
- **允许的 `type`**：`build`、`chore`、`ci`、`docs`、`feat`、`fix`、`perf`、`refactor`、`revert`、`style`、`test`、**`api`**、**`release`**。
- **允许的 `scope`（共 23 个，写错会被 `commit-msg` 拦截）**：
  `connector`、`console`、`core`、`demo-app`、`test`、`phrases`、`schemas`、`shared`、`experience`、`experience-legacy`、`deps`、`deps-dev`、`cli`、`toolkit`、`cloud`、`app-insights`、`elements`、`translate`、`tunnel`、`account-elements`、`account`、`api`、`job-queue`（跨多包修改可用逗号分隔，如 `fix(core,schemas): ...`）。

### 2.3 新特性开关与 Changeset 规则 (`AGENTS.md`)
- **开发中新特性**：必须用 `isDevFeaturesEnabled` 守护（附带高层级特性名称注释，方便日后按特性整体移除），**不添加 Changeset**（`isDevFeaturesEnabled` 与 Changeset 绝不同时为同一改动出现）。
- **特性正式发布**：仅移除该特性自己的 `isDevFeaturesEnabled`（严禁误删其他特性的开关），并补充对应 Changeset。
- **独立 Bug 修复**：不需要加 `isDevFeaturesEnabled`；若修复影响了已发布行为，运行 `pnpm changeset` 添加 Changeset：
  - 第一段：小写字母开头、**末尾不加句号**的一句话精炼摘要（面向最终用户描述产品行为，不写内部实现细节）。
  - 可选第二段：补充详细说明。

---

## 3. 代码风格关键约束 (`@silverhand/eslint-config`)

仓库启用了极为严格的 ESLint 规则集，编写代码时需提前规避以下高频拦截项：
1. **函数式不可变偏好（`@silverhand/fp/*`）**：默认禁止对象属性直接赋值修改（`no-mutation`、`no-mutating-methods`、`no-let` 视场景而定），优先使用对象展开、`map`/`filter`/`toSorted` 等纯函数写法。
2. **禁止隐式类型断言与 `any`**：禁止无注释使用 `as Foo`（`no-restricted-syntax`），优先使用 Zod `parse`/`safeParse` 或类型守卫函数进行类型收窄。
3. **禁止直接使用 `console.*`**：`@logto/core` 强制 `"no-console": "error"`，日志输出统一使用 `ctx.console`、`getConsoleLogFromContext(ctx)` 或 `@logto/shared` 的 `ConsoleLog`。
4. **禁止残留未使用导出**：`@logto/core` 启用了 `import/no-unused-modules`（`unusedExports: true`），新增的 `export` 若在包内无消费者会触发 Lint 报错。
5. **所有 `eslint-disable` 必须带原因**：例如 `// eslint-disable-next-line no-restricted-syntax -- needed to narrow untyped undici symbol`。

---

## 4. Windows 原生环境开发专项避坑指南

由于上游仓库脚本最初面向 macOS / Linux 设计，在 Windows（PowerShell / CMD）下直接运行部分命令存在平台差异与已知问题，建议按以下方式配置或规避：

1. **POSIX Shell 脚本依赖（`generate.sh` / `rm -rf` / `rsync`）**：
   - `packages/schemas/package.json`（`./generate.sh`）、`packages/console/package.json`（`./generate.sh`）、`packages/api/package.json`（`./check-types.sh`）以及 `packages/core/package.json`（`rm -rf`、`rsync`）直接调用了 POSIX Shell 工具。
   - **推荐做法**：
     - **方案 A（最稳妥）**：在 **WSL2** 或 Docker DevContainer 中运行全量构建与集成测试。
     - **方案 B（Windows 原生）**：将 pnpm 的 `script-shell` 配置为 Git for Windows 自带的 `bash.exe`（`pnpm config set script-shell "C:\\Program Files\\Git\\bin\\bash.exe"`），并在 MSYS2/Git Bash 或 `cwRsync` 中确保 `rsync` 可用（注：`packages/core` 的正常 `pnpm build` 使用 `tsup.config.ts` 内置 Node `fs.cp` 拷贝 `*.openapi.json`，不依赖 `rsync`；仅 `build:test` / `copy:apidocs` 调用了 `rsync`）。
2. **Windows 原生运行 `@logto/cli` 连接器加载器的 ESM URL 陷阱**：
   - `packages/cli/src/connector/loader.ts:45, 51` 直接调用了 `await import(path.join(connectorPath, 'lib/index.js'))` 而未转换为 `pathToFileURL(...).href`。在 Windows 原生 Node.js 下传入绝对路径（如 `E:\...`）会抛出 `ERR_UNSUPPORTED_ESM_URL_SCHEME (Received protocol 'e:')`。若需在 Windows 原生直接启动 `core` 并加载连接器，应将该处修复为 `import(pathToFileURL(path.join(...)).href)`。
3. **Windows 下 `node:path` 拼接 URL 路径的反斜杠问题**：
   - `packages/core/src/middleware/koa-console-redirect-proxy.ts:20, 25` 与 `packages/core/src/oidc/utils.ts:409` 误用了平台相关的 `path.join` 拼接 HTTP URL 路径，在 Windows 原生运行时会产生 `\console\welcome` 与 `\direct\...` 反斜杠重定向。在任何处理 URL 或对象存储 Key 的代码中，**严禁使用 `node:path`，必须使用 `path.posix` 或 `@silverhand/essentials` 的 `appendPath`**。
4. **行尾序列（CRLF vs LF）**：
   - 仓库包含 `.sh` 脚本与 Prettier 校验，Windows Git 建议配置 `git config core.autocrlf input`（或保持 `.sh` 文件为 `LF`），避免 `.sh` 脚本出现 `\r: command not found`。
