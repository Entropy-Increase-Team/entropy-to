# Entropy-To Agent 长期开发知识库 (`docs/agent/`)

本目录是面向 AI Coding Agent（及核心研发工程师）建立的**长期可演进架构与安全知识库**。

- **项目仓库**：`Entropy-Increase-Team/entropy-to`（Fork 自官方 `logto-io/logto`，初始同步基线 commit `8640acb18`，核心版本 `@logto/core@1.46.0`）
- **定位**：现代化开源身份认证与访问管理基础设施（CIAM / Auth Infrastructure），原生支持 OIDC、OAuth 2.1、SAML 2.0、企业级 SSO、多租户（PostgreSQL RLS 强隔离）、组织架构（Organizations / B2B 多租户）、RBAC、ABAC（应用级访问控制）、Adaptive MFA、Passkey（WebAuthn）、Client ID Metadata Document（CIMD / MCP Agent 鉴权）及持久化异步任务队列。

---

## 1. 按开发场景查阅指南（Agent 必读路由表）

为避免单次加载过多无关上下文，Agent 在开始具体开发、重构或排障前，请**按需精确读取**对应专题文档：

| 专题文档 | 涵盖核心内容 | 何时必须阅读 |
| --- | --- | --- |
| [`01-architecture-and-runtime.md`](./01-architecture-and-runtime.md) | Core 启动链路、双端口（3001/3002）、两级 Koa 中间件栈、多租户路由解析、`TenantPool` 引用计数、优雅停机、Redis 代际缓存、Worker 线程池 | 修改服务启动、Koa 全局中间件、多租户解析、缓存失效、自定义域名或后台 Worker 时 |
| [`02-monorepo-packages-and-tech-stack.md`](./02-monorepo-packages-and-tech-stack.md) | 22 个工作区包 + 57 个连接器全景清单、五层依赖拓扑、ESM/tsup/Vite 构建产物规范、代码生成管线 | 新增包、调整跨包依赖、排查类型找不到或构建产物过期时 |
| [`03-database-schemas-and-rls.md`](./03-database-schemas-and-rls.md) | `packages/schemas` 自动生成机制、PostgreSQL 每租户独立 Role + `RESTRICTIVE` RLS 隔离、**RLS Leakproof 索引铁律与派生列触发器**、Slonik 构建器、Alteration 迁移规范 | 修改 SQL 表结构、新增索引、编写数据库迁移（Alterations）、优化慢查询或编写 Slonik SQL 时 |
| [`04-oidc-saml-sso-and-security.md`](./04-oidc-saml-sso-and-security.md) | `node-oidc-provider` Fork 集成、5 种 OAuth Grant、Organization Token、第三方应用 Consent、CIMD、SAML IdP、Enterprise SSO SP、JIT 编排、Custom JWT、Secret Vault 信封加密、私钥平滑轮换、SSRF 防护 | 涉及 Token 签发、Scope 权限计算、SAML/SSO 协议、密钥轮换、Token Exchange 或出站 HTTP 请求时 |
| [`05-auth-flows-and-api-surfaces.md`](./05-auth-flows-and-api-surfaces.md) | 五大 HTTP API 路由面、Experience v2 状态机（`ExperienceInteraction` + 12 类 `VerificationRecord` + Step-Up + MFA + Captcha + Sentinel）、Account Center 字段级权限、Management API `koaGuard` 与 OpenAPI 自动生成 | 开发登录/注册/找回密码/MFA 交互流、新增或修改 `/api/*` / `/api/my-account/*` 接口、更新 OpenAPI 文档时 |
| [`06-frontend-cli-and-i18n.md`](./06-frontend-cli-and-i18n.md) | Core 静态托管与 SSR 注入、`experience` / `console` / `account` / `elements` 前端架构、`console/CONVENTION.md`（含 RHF 铁律）、多语言双包体系（`phrases` / `phrases-experience`）、`@logto/cli` 与 `@logto/tunnel` | 开发管理控制台、登录页、个人中心前端、修改多语言文案或扩展 CLI 命令时 |
| [`07-connectors-webhooks-and-job-queue.md`](./07-connectors-webhooks-and-job-queue.md) | `@logto/connector-kit` 接口契约、57 个官方连接器矩阵、i18n 邮件模板与变量插值、Webhook 31 种事件与签名、`@logto/job-queue` 持久化队列（公平抢占、围栏结算、断路器） | 新增/修改社交、短信、邮件连接器，或调整 Webhook 事件与后台任务队列逻辑时 |
| [`08-dev-workflow-and-windows-guide.md`](./08-dev-workflow-and-windows-guide.md) | 常用开发/检查/测试命令、Commitlint `type`/`scope` 枚举、Changeset 与 `isDevFeaturesEnabled` 规则、单测/集成测试架构、**Windows 原生环境专属避坑指南** | 执行本地编译、运行测试、提交 Git Commit、创建 PR 或在 Windows 环境下排障时 |
| [`09-code-and-security-review.md`](./09-code-and-security-review.md) | 基于 `8640acb18` 源码核实的 **32 项安全漏洞、协议缺陷、并发竞态与功能 Bug 审计台账**（含精确文件行号、触发条件与修复建议） | 进行安全加固、修复已知上游缺陷、开展代码审查或在敏感模块二次开发防止引入同类问题时 |

---

## 2. 核心技术栈速查

| 维度 | 技术选型 | 关键说明 |
| --- | --- | --- |
| **运行时与包管理** | Node.js `^22.23.4 \|\| ^24.22.1 \|\| ^26.12.1`（Docker 默认 Node 26 Alpine），pnpm `^12.0.0` | 全仓强制纯 ESM（`"type": "module"`），禁止 npm/yarn |
| **后端框架** | Koa `^3.2.1` + `koa-router` `^12` + `oidc-provider`（Logto 维护的 v9 Fork） | 双层 Koa App（Root 租户分发器 -> Per-Tenant Koa 实例） |
| **数据库与 ORM** | PostgreSQL `14+`（推荐 PG 17）+ `@silverhand/slonik` `31.0.0-beta.4` | 无传统重型 ORM；通过 SQL DDL 自动生成 TS 类型与 Zod Guard + 类型安全 `sql` 模板标签 |
| **数据校验与 API 契约** | Zod `3.24.3` + 自定义 `koaGuard` + `@withtyped/server` / `@withtyped/client` + `openapi-typescript` | `koaGuard` 同时承担运行时入参/出参校验与 OpenAPI 3.0.1 文档反射生成 |
| **缓存与队列** | Redis `4.x`（可选，未配自动降级）+ `lru-cache` + 自研 PostgreSQL `@logto/job-queue` | 缓存采用代际键（Generation Key）防并发脏写回；队列采用 `FOR UPDATE SKIP LOCKED` 租约与围栏结算 |
| **加密与认证协议** | `jose` `^6`、`hash-wasm`（Argon2i / Bcrypt / MD5 / SHA）、`@simplewebauthn/server` `^13`、`otplib`、`samlify` `^2.13` + `@authenio/samlify-node-xmllint`、`node:crypto`（AES-256-GCM） | 支持 OIDC、OAuth 2.1、RFC 8693 Token Exchange、RFC 8628 Device Flow、RFC 8707 Resource Indicators、RFC 9470 Step-Up、SAML 2.0、SIWE（EIP-4361） |
| **前端技术栈** | React `18.3`、Vite `6`、TypeScript `5.9`、React Router `6.30`、SWR `2`、`react-hook-form` `7`、`ky`、SCSS Modules、Lit `3`（`@logto/elements`） | 5 个独立构建的 SPA 由 `@logto/core` 统一代理（开发态）或静态托管 + SSR 注入（生产态） |
| **测试体系** | Jest `29`（`core`、`console`、`experience`、`account`、`integration-tests`）、Vitest `4`（`schemas`、`cli`、`job-queue`、`toolkit`、`connectors`）、Playwright / Puppeteer | 单元测试 + 数据库正向/逆向迁移比对测试 + Docker 全链路 API/UI 集成测试 |

---

## 3. 本地默认端口与服务映射

| 端口 | 归属组件 | 作用说明 |
| --- | --- | --- |
| `3001` | `@logto/core` 主服务 (`ENDPOINT`) | 默认租户（`default`）OIDC、API、登录体验页（`/`）、个人中心（`/account`）、Demo App（`/demo-app`） |
| `3002` | `@logto/core` 管理端监听器 (`ADMIN_ENDPOINT`) | OSS 模式下路由至 `admin` 租户，托管管理控制台 `/console` 及 `/me` 接口 |
| `5001` / `6001` | `@logto/experience` Vite Dev / HMR | 开发模式下由 Core `/` 反向代理 |
| `5002` / `6002` | `@logto/console` Vite Dev / HMR | 开发模式下由 Core `:3002/console` 反向代理 |
| `5003` / `6003` | `@logto/demo-app` Vite Dev / HMR | 开发模式下由 Core `/demo-app` 反向代理 |
| `5004` / `6004` | `@logto/account` Vite Dev / HMR | 开发模式下由 Core `/account` 反向代理 |
| `5005` / `6005` | `@logto/device-demo-app` Vite Dev / HMR | 开发模式下由 Core `/device-demo-app` 反向代理 |
| `9000` | `@logto/tunnel` | 本地调试自定义登录 UI（Bring-Your-UI）连接远端 Logto 实例的反向代理端口 |

---

## 4. Agent 代码变更黄金红线（Golden Rules）

1. **新特性门控与 Changeset 互斥**：除非用户明确要求直接发布，否则所有新功能必须使用 `EnvSet.values.isDevFeaturesEnabled`（前端/共享层对应 `isDevFeaturesEnabled`）包裹并附带高层级特性注释，**严禁同时添加 Changeset**；独立 Bug 修复无需门控，若影响已发布行为则添加标准格式 Changeset（首段小写字母开头、无句号的单句摘要）。
2. **API 变更必同步 OpenAPI**：修改任何 `koaGuard` 或路由行为时，同步更新同目录下的 `*.openapi.json`；开发中接口使用 `tags: ["Dev feature"]` 或字段级 `x-logto-dev-feature: true`。
3. **数据库 RLS 索引红线**：租户查询运行在受 PostgreSQL `RESTRICTIVE` RLS 约束的租户 Role 下，**严禁在热查询谓词或新建索引中使用非 Leakproof 函数**（如 `lower(col)`、`payload->>'k'`、`LIKE`）；必须通过 `BEFORE INSERT OR UPDATE` 触发器维护普通派生列（`<col>_lower` 或 `payload_<key>`）并建立 `WHERE <col> IS NOT NULL` 部分索引。
4. **出站网络请求必须经过 SSRF 防护**：任何目标 URL 来自租户管理员、连接器配置、客户端元数据或用户输入的服务端请求，必须使用 `ssrfProtectedFetch` 或 `ssrfProtectedGot`（`packages/core/src/utils/outbound-request.ts`）。
5. **跨包构建产物同步**：修改 `schemas`、`phrases*`、`toolkit/*`、`cli`、`elements` 后，若下游包报类型或运行错误，执行 `pnpm prepack`（修改 SQL 表定义需先确保 `packages/schemas` 执行 `pnpm build` 生成 `db-entries`）。
6. **多语言同步**：修改 `packages/phrases` 或 `packages/phrases-experience` 的 `en` 文案后，同步更新其余所有内置语言文件（可使用 `pnpm translate sync-keys` 同步结构并翻译）。
7. **严禁跳过 Git Hooks 与无理由 Lint 抑制**：绝不使用 `--no-verify`；所有 `eslint-disable` 必须附带简短原因注释。
