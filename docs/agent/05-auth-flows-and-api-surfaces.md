# 05 — API 路由全景、Experience 认证状态机、Account Center 与 Management API

本章详细说明 `@logto/core` 暴露的五大 HTTP 接口体系、Experience v2 认证交互状态机、Account Center 字段级鉴权模型，以及 Management API 的参数校验与 OpenAPI 自动生成机制。

---

## 1. Core 五大 HTTP 接口面总览

| 接口面 | 路由前缀 | 认证鉴权中间件 | 核心定位与典型消费者 |
| --- | --- | --- | --- |
| **OIDC 协议端点** | `/oidc/*` | `node-oidc-provider` 会话 / 客户端密钥 / PKCE | 授权端点 `/oidc/auth`、令牌 `/oidc/token`、用户信息 `/oidc/me`、JWKS `/oidc/jwks`、设备流 `/oidc/device/auth` |
| **Experience API (v2)** | `/api/experience/*`<br/>（及授权页 `/api/interaction/consent`） | OIDC `_interaction` 会话 Cookie（`koaInteractionDetails` + `koaExperienceInteraction`） | 终端用户登录（`SignIn`）、注册（`Register`）、找回密码（`ForgotPassword`）及 Step-Up 二次核身状态机，供 `@logto/experience` 或自定义登录 UI 调用 |
| **Account Center & Verification API** | `/api/my-account/*`<br/>`/api/verifications/*` | `koaOidcAuth`（第一方应用签发的含 `openid` scope 的不透明 `AccessToken`）+ 字段级开关 + Step-Up 核身 | 终端用户自助管理个人资料、邮箱/手机、密码、社交绑定、MFA、Passkey、活跃会话、授权记录、PAT 及第三方 Token Vault |
| **Management API** | `/api/*` | `koaAuth`（`aud = https://<tenant>/api` 且含 `all` scope 的 JWT，信任本租户及 `admin` 租户 JWKS） | 租户管理后台（`@logto/console`）及业务后端 M2M 服务调用的全量管理接口 |
| **Console `/me` API & 匿名公开 API** | `/me/*`（仅 `admin` 租户）<br/>`/api/.well-known/*`、`/api/authn/*`、`/api/saml*`、`/api/status` | `/me`：`koaAuth` 用户态 JWT；<br/>匿名路由：无鉴权（协议自身验签） | 控制台管理员个人设置与 OSS 成员邀请；前端配置下发、SAML ACS 回调、Hasura 鉴权钩子、OpenAPI JSON |

---

## 2. Experience API v2 认证状态机 (`packages/core/src/routes/experience/`)

完整端到端流程图参见仓库根目录 [`end-user-flows/`](../../end-user-flows/)（`sign-in-flow.md`、`register-flow.md`、`forgot-password-flow.md`、`consent-flow.md`）。

### 2.1 状态容器 `ExperienceInteraction` (`classes/experience-interaction.ts`)
- **生命周期持久化**：每次请求由 `koaExperienceInteraction` 从 `node-oidc-provider` 的 `Interaction` 实例（`oidc_model_instances`，TTL 3600s）反序列化 `InteractionStorage`，执行路由逻辑后调用 `experienceInteraction.save()` 写回数据库。
- **三大交互事件 (`InteractionEvent`)**：
  - `SignIn` <-> `Register`：允许通过 `PUT /api/experience/interaction-event` 互相切换；切换时调用 `clearIdentityScopedState()` 清空已识别的 `userId`、暂存 `profile`、`mfa` 与 `authenticationProofs`，但保留 `verificationRecords`（例如社交登录后发现账号不存在，直接携带已验证的社交记录切入 `Register` 补全资料）。
  - `ForgotPassword`：**严格隔离**，既不允许从 `SignIn`/`Register` 切入，也不允许切出，且 `submit` 只重置密码并清空交互，绝不签发 OIDC 登录态。
- **Pure Step-Up 模式（RFC 9470 二次核身，`isStepUp`）**：
  - 当已有活跃 OIDC 会话但依赖方请求更高 `acr_values`（如 `urn:logto:acr:mfa` / `urn:logto:acr:passkey`）或更短 `max_age` 时触发。
  - 锁定 `subjectUserId = session.accountId`（不可切换账号或切为注册），由 `koaStepUpRouteGuard` 严格白名单放行核身路由，复用会话内未过期的 `carriedContributions`，满足目标 `acr` 后直接回写 OIDC 登录结果。

### 2.2 十二种验证记录 (`VerificationRecord` & `VerificationRecordsMap`)
`VerificationRecordsMap` 以 `VerificationType` 为键存储当前交互内的验证凭据（**同类型仅保留最新一条记录**）：
1. `Password`：校验密码（失败时支持触发 `PostFirstFactorVerification` Action 迁移外部旧系统密码）。
2. `EmailVerificationCode` / `PhoneVerificationCode`：首因素/资料绑定 6 位一次性验证码（绑定 `jti` 与 `interactionEvent`）。
3. `MfaEmailVerificationCode` / `MfaPhoneVerificationCode`：**独立枚举键**，专门用于二阶段 MFA 邮箱/短信验证或绑定，避免覆盖同一次注册/登录中首阶段已验证的 `EmailVerificationCode`/`PhoneVerificationCode`。
4. `Social`：OAuth/OIDC/SIWE/Google One Tap 社交身份验证，支持暂存加密后的第三方 Token Set。
5. `EnterpriseSso`：企业级 OIDC/SAML SSO 验证及 Token Set 暂存。
6. `TOTP`：生成新密钥或校验已有 TOTP 动态码（数据库侧通过 `updateUserTotpMfaVerificationLastUsed` 原子记录 `lastUsedTimeStep` 防同一时间片重放）。
7. `BackupCode`：生成 10 组备用恢复码或校验未使用的恢复码。
8. `WebAuthn`：二因素安全密钥/平台认证器（`residentKey: 'discouraged'`, `userVerification: 'preferred'`）。
9. `SignInPasskey`：首因素可发现通行密钥（`residentKey: 'required'`, 强制要求 `userVerification: 'required'`），签发 `urn:logto:acr:passkey`。
10. `NewPasswordIdentity`：注册专用，预校验用户名/邮箱/手机唯一性、邮箱黑名单与密码复杂度并预哈希密码。
11. `OneTimeToken`：校验并核销 Magic Link / 组织邀请一次性令牌，提取 `jitOrganizationIds`。

`AuthenticationProofs`（`classes/libraries/authentication-proofs.ts`）跟踪所有已消费的 `verificationId` 及其用途角色（`Identify`、`Create`、`MfaVerify`、`MfaBind`、`PasskeyBind`），防止同一 `verificationId` 被一证两用（例如既当首因素又当二因素），并据此精确计算最终会话的 `acr` 与 `amr`。

### 2.3 五阶段提交门禁链 (`POST /api/experience/submit`)
提交登录/注册时，`ExperienceInteraction.submit()` 按严格顺序执行校验与落库：
1. **人机验证 (`guardCaptcha`)**：支持 Turnstile、reCAPTCHA Enterprise、GeeTest v4、Cap WASM、Friendly Captcha。
2. **首因素与目标 ACR 可达性校验 (`guardFirstFactor` + `guardUnreachableRequestedAcr`)**。
3. **登录态 MFA 核验 (`guardMfaVerificationStatus`)**：
   - `EnterpriseSso` 与 `SignInPasskey` 默认豁免二因素（除非客户端显式要求 `urn:logto:acr:mfa`）。
   - 开启 **Adaptive MFA** 时，结合必选策略与四大风险规则（新国家 `NewCountryRule`、超 1000km/h 异地跃迁 `GeoVelocityRule`、超 30 天未登录 `LongInactivityRule`、低分 IP `UntrustedIpRule`）动态判定是否拦截要求 MFA。
   - 支持通过绑定用户的 `__Host-logto-trusted-device-<hash>` Cookie 常量时间比对免除重复 MFA。
   - **防空手套白狼绑定门禁 (`canBindMfa`)**：若已绑定 MFA 的老用户在本次登录中跳过了 MFA 核验（如通过受信任设备或低风险放行），严禁在本次交互内绑定新 MFA 因子。
4. **必填资料与 MFA 因子补全 (`assertUserMandatoryProfileFulfilled` + `mfa.assertMfaFulfilled` + `trustedDevice.assertOptInDecision`)**：未满足时依次抛出语义化 `422` 错误码驱动前端跳转对应引导页（补邮箱/手机/自定义字段、绑定 Passkey、绑定必选 MFA、保存 Backup Codes、选择是否信任当前设备）。
5. **原子落库与后置钩子**：更新 `users`、写入 `secrets` 保险箱、执行 JIT 组织入组、运行 `PostSignIn` Action（可 `denyAccess` 拦截），最后调用 `provider.interactionResult` 完成 OIDC 授权并触发异步 Webhook。

### 2.4 Sentinel 防爆破与外发频率保护 (`packages/core/src/sentinel/`)
- **登录/核身防爆破 (`BasicSentinel`)**：
  - **首因素共享池**：`Password`、`VerificationCode`、`OneTimeToken` 按归一化标识符哈希共享计数桶（默认 1 小时内失败 100 次封禁 60 分钟，可在 `sign_in_experiences.sentinel_policy` 自定义，如 5 次）。
  - **MFA 因子独立桶**：`MfaTotp`、`WebAuthn`、`MfaBackupCode` 按 `sha256(userId)` 各自独立计数，避免单一 MFA 方式锁死其他恢复手段。
  - 管理端可通过 `POST /api/sentinel-activities/delete` 手动解封指定标识符。
- **消息轰炸防护 (`MessageRateGuard`)**：独立统计每个收件邮箱/手机号成功下发验证码与组织邀请的速率，超限直接抛 `429 request.message_rate_limited` 并触发 `Message.RateLimited` 异常 Webhook。

---

## 3. Account Center API 权限模型 (`packages/core/src/routes/account/`)

1. **客户端与总开关隔离**：
   - `koaAccountCenter` 检查 `account_centers.enabled === true`。
   - 敏感接口调用 `assertFirstPartyClient(queries, clientId)` 拦截第三方应用令牌（`403`）。
2. **字段级三态权限 (`account_centers.fields`)**：
   - 支持对 `name`、`avatar`、`profile`、`email`、`phone`、`password`、`username`、`social`、`customData`、`mfa`、`passkey`、`session`、`pat`、`trustedDevice` 分别配置 `Off`（隐藏且禁写）、`ReadOnly`（可读禁写）、`Edit`（可读写），并与 Access Token 所含 OIDC `UserScope`（`profile`、`email`、`phone`、`identities`、`custom_data`）取交集。
3. **双模敏感操作二次核身 (`assertIdentityVerified`)**：
   - 修改邮箱、手机、密码、MFA、社交绑定、PAT 等高危操作满足以下任一条件即可放行：
     - **方式 A（RFC 9470 会话新鲜度）**：当前 Access Token 关联的 OIDC 会话 `loginTs` 在 `maximumAuthenticationAgeInSeconds`（默认 600s）内，且 `acr` 满足账号安全等级（有密码或 MFA 的账号要求 `mfa`/`passkey`，纯社交账号要求 `1fa`）；
     - **方式 B（核身记录头）**：先调用 `/api/verifications/*` 验证密码/验证码获取有效期 10 分钟且绑定当前 `userId` 的记录，并在请求头携带 `logto-verification-id: <id>`。

---

## 4. Management API 开发规范与 OpenAPI 管线

新增或修改 Management API（`packages/core/src/routes/`）遵循统一范式：
1. **函数签名**：导出 `default function xxxRoutes<T extends ManagementApiRouter>(...[router, tenant]: RouterInitArgs<T>)`。简单单表 CRUD 可优先评估复用 `SchemaRouter`（`utils/SchemaRouter.ts`）。
2. **`koaGuard` 强校验（`middleware/koa-guard.ts`）**：
   - 所有路由必须挂载 `koaGuard({ params, query, body, files, response, status })`。
   - `response` Guard 不仅校验返回结构，还会**自动剥离未声明的多余字段**（防止意外泄露敏感数据库列），且 `status` 数组必须完整声明该路由可能返回的所有成功/业务错误 HTTP 状态码。
3. **分页规范（`middleware/koa-pagination.ts`）**：
   - 列表接口挂载 `koaPagination()`，读取 `ctx.pagination`（`limit`、`offset`），将总条数写入 `ctx.pagination.totalCount`，中间件自动注入 `Total-Number` 与 RFC 5988 `Link` 响应头。
4. **OpenAPI 补充文档与 Dev Feature 标记（`AGENTS.md` 硬性要求）**：
   - 路由参数/请求体/响应体由 Swagger 引擎直接从 `koaGuard` 的 Zod 对象反射生成；接口语义描述（`summary`、`description`、状态码说明、`tags`）写在同目录的 `<name>.openapi.json` 中。
   - **未发布新接口**：在 `*.openapi.json` 对应操作上添加 `"tags": ["Dev feature"]`；若是在已有接口 Schema 上新增未发布字段，在该属性上标注 `"x-logto-dev-feature": true`。生产环境关闭 `DEV_FEATURES_ENABLED` 时，`/api/swagger.json` 与 `/api/.well-known/*.openapi.json` 会自动裁剪所有带该标记的接口和字段。
