# 09 — 全量代码与安全审计报告（基线 `8640acb18`）

本文档记录对 `entropy-to`（Fork 基线 `8640acb18`）五大子系统进行全量源码级交叉审查并逐行核实后的 **32 项真实安全漏洞、协议合规缺陷、并发竞态与逻辑 Bug**。本台账供后续团队进行安全加固、Bug 修复及二次开发避坑使用。

---

## 审计概览统计

| 严重等级 | 数量 | 核心风险分布 |
| --- | --- | --- |
| **Critical（严重）** | 5 | Hasura 鉴权钩子空凭证 `200 OK` 绕过、Custom UI 跨租户对象存储路径遍历、`connector-kakao` 未验证邮箱账号接管、`connector-saml` 缺失 `<Audience>` 校验与全局 XSD 校验器覆盖、连接器层绕过核心 SSRF 防护（含未保存 `/test` 接口读取内网响应） |
| **High（高危）** | 15 | `/oidc/auth` `direct_sign_in` 开放重定向、社交/企业目录未验证邮箱/手机默认接管、前端 `/social/landing` 开放重定向与 OAuth 授权码劫持、`customContent` 与 `javascript:` URL 存储型 XSS、Account Center 字段权限绕过与 GET 自动解绑、WebAuthn 注册缺失 `expectedRPID` 及跨用户记录绑定、`/user-assets` 路径遍历与 SVG XSS、企业 SSO 新用户注册绕过 `domains` 限制、旧版 `/api/interaction` Sentinel 绕过、`withSentinel` 锁定前核销一次性凭据、`rediss://` 默认关闭证书校验、`/systems/license` 跨租户越权读写、SAML IdP 回调状态绕过、OIDC `nonce` 条件跳过、CLI 命令注入与目录遍历 |
| **Medium（中危）** | 9 | Token Exchange `subject_tokens` TOCTOU 与 Refresh Token 无限滑动重放窗、Token Exchange `actor_token` 校验缺失与吊销遗漏、自托管脚本执行器继承宿主敏感环境变量与覆盖 `organization_id`/`act`、`getScopedProfile` 数组展开导致 `ssoIdentities` 永久丢失、`buildUpdateWhereWithPool` 静默丢弃 `undefined` `WHERE` 条件、JWKS/轮换缓存未等待失效、云片日志明文打印密钥/验证码、短信连接器 `uiLocales` 破坏发送、`@logto/tunnel` JSON 数组损坏与 Token 日志泄露 |
| **Low（低危/健壮性）** | 3 | Webhook 响应体无上限缓冲、`Tenant.create` 半途失败连接池泄漏、自定义域名反查顺序导致全表扫描、Windows 原生 ESM `import()` 与 `path.join` 兼容性 Bug 等 |

> **已核实无虞的核心防线**：PostgreSQL 租户级 `AS RESTRICTIVE` RLS 策略与启动前置 `rowsecurity` 强校验（`env-set/preconditions.ts`）、`CoreJobQueue` 跨租户 `sharedPool` 查询中的 `tenant_id` 围栏条件、SIWE（EIP-4361）签名/Nonce/域名校验、`ForgotPassword` 与 `SignIn` 状态机隔离、单条 `passcodes` 验证码尝试次数的数据库行级原子递增。

---

## 一、Critical 级漏洞（优先修复）

### [C-01] Hasura 鉴权 Webhook 在未配置匿名角色且未传 `Expected-Role` 时对无凭证请求直接返回 `200 OK` 认证绕过 + 无受众回退验签
- **位置**：`packages/core/src/routes/authn.ts:57-98`、`packages/core/src/middleware/koa-auth/index.ts:42-69`
- **根因分析**：
  1. `verifyToken` 捕获了所有验签异常并返回 `{ sub: undefined }`。当查询参数未传 `unauthorizedRole`（即禁止匿名访问）且请求头未传 `Expected-Role` 时，`if (unauthorizedRole ...)` 与 `if (expectedRole)` 两个分支均被跳过，代码在 `L93-97` 直接向无 Token 或伪造 Token 的请求返回 **`200 OK`（`{}`）** 而非 `401`，导致接入该 Webhook 的 Hasura 实例将未认证请求视作合法通过。
  2. 在 `L78` 回退分支调用 `verifyToken()` 时未传 `expectedResource`，底层 `jwtVerify` 完全省略 `audience` 校验且同时信任 `admin` 租户公钥，允许拿同租户 `id_token`、其他 API 资源的 Access Token 甚至 M2M Token 混用提取 `sub`。
- **修复建议**：当 `!unauthorizedRole && !sub` 时立即抛出 `401 auth.unauthorized`；移除 `L78` 无 `expectedResource` 的二次验签回退，并校验 `typ === 'at+jwt'`。

### [C-02] 自定义登录 UI 静态托管中间件 (`koaServeCustomUiAssets`) 路径未规范化导致跨租户 Blob 遍历读取（附非法 `Cache-Control` 与负 `Range` 500）
- **位置**：`packages/core/src/middleware/koa-serve-custom-ui-assets.ts:14, 39-63`、`packages/toolkit/core-kit/src/utils/url.ts:172-186`
- **根因分析**：
  1. `const fileObjectKey = "${tenantId}/${customUiAssetId}${isFileAssetRequest ? ctx.request.path : '/index.html'}"` 直接拼接未规范化的原始 `ctx.request.path`。在多租户共享 `experience-blobs` 容器（尤其是 Azure Blob Storage）下，包含 `..` 路径段的原始 HTTP 请求路径在构造底层 REST URL 时会向上逃逸出当前租户目录，未授权读取其他租户的自定义 UI 资产或 SourceMap。
  2. `L14` 将 `maxAgeSevenDays` 写成了字符串字面量 `'max-age=604_800_000'`（既把 JS 数字分隔符下划线写进了字符串，又误用了毫秒而非秒），违反 RFC 9111 导致浏览器与 CDN 缓存完全失效。
  3. `parseRange` 未校验 `start <= end`，传入 `Range: bytes=100-50` 算出负数 `count = -49`，导致存储 SDK 抛未捕获异常返回 `500` 而非 `416`。
- **修复建议**：解码后拒绝含 `\0`、`\`、`..` 的请求路径，使用 `path.posix.normalize` 并强制断言前缀为 `${tenantId}/${customUiAssetId}/`；修正 `'max-age=604800'`；在 `parseRange` 中校验 `end >= start`。

### [C-03] `connector-kakao` 混淆 `is_email_valid` 与 `is_email_verified`，导致未验证邮箱直接触发任意账号接管
- **位置**：`packages/connectors/connector-kakao/src/index.ts:110-120`、`types.ts:20-32`；关联 `packages/core/src/libraries/social.ts:215-235`、`packages/experience/src/containers/SocialLinkAccount/index.tsx:61-70`
- **根因分析**：
  - Logto 在社交登录匹配到同邮箱/同手机号存量用户时（无论开启自动关联，还是用户在提示页点击“绑定已有账号” `linkSocialIdentity: true`），**均不要求验证目标存量账号的密码或验证码**，完全依赖连接器仅返回已验证邮箱的前提。
  - Kakao `/v2/user/me` 同时返回 `is_email_valid`（仅代表格式有效且非休眠掩码）与 `is_email_verified`（真正验证过邮箱归属），但 `connector-kakao` 仅检查了 `is_email_valid` 而漏掉了 `is_email_verified`。持有未验证受害者邮箱的 Kakao 账号登录即可直接绑定并接管受害者在 Logto 中的账号。
- **修复建议**：在 `connector-kakao` 的 `userInfoResponseGuard` 中补充 `is_email_verified: z.boolean().optional()`，修改为 `conditional(is_email_valid && is_email_verified && email)`。

### [C-04] `connector-saml` 缺失 `<saml:Audience>` 校验、XML 校验恒返回 `true` 且跨请求覆盖全局 `samlify` XSD 校验器
- **位置**：`packages/connectors/connector-saml/src/utils.ts:78-106`、`packages/core/src/saml-application/SamlApplication/index.ts:189, 195, 627-643`、`packages/core/src/sso/SamlConnector/utils.ts:42, 193`、`packages/core/src/sso/SamlConnector/index.ts:335-345`
- **根因分析**：
  1. `samlify` 本身不检查 `<saml:AudienceRestriction>`。虽然企业级 `core/src/sso/SamlConnector` 手动补充了 Audience 校验，但社交连接器 `connector-saml` 完全未校验 `assertionResult.extract.audience` 是否匹配配置的 `entityID`，同一 IdP 签发给其他任意 SP 的合法断言均可重放至 `/api/authn/saml/:connectorId` 登录。
  2. `fast-xml-parser` 的 `XMLValidator.validate()` 在 XML 非法时**返回 `{ err }` 对象而非抛异常**，`connector-saml/src/utils.ts:81`（以及 `SamlConnector/index.ts:336`）忽略返回值并用 `try/catch` 包裹，导致校验函数恒返回 `true`。
  3. `saml.setSchemaValidator(...)` 修改的是 **`samlify` 进程级全局变量**！当进程内并发处理 SAML Application（IdP）或 `connector-saml` 请求时，会将企业级 SSO（`SamlConnector`）设置的 `@authenio/samlify-node-xmllint`（防 XML 签名包装攻击 XSW 必需的完整 SAML XSD 校验）覆盖为仅检查基础语法的 `XMLValidator`，造成跨租户并发降级。
- **修复建议**：在 `connector-saml` 中补齐 `audience` 精确匹配；进程启动时全局唯一初始化 `@authenio/samlify-node-xmllint`，移除运行期各处覆盖 `saml.setSchemaValidator` 的调用；所有 `XMLValidator.validate` 调用必须判断 `result !== true`。

### [C-05] 全部 `packages/connectors/*` 独立发起网络请求，完全绕过 Core SSRF 防护（含连接器测试接口全响应回显及 Mailgun 后缀绕过）
- **位置**：`packages/connectors/connector-http-email/src/index.ts:29-56`、`connector-http-sms/src/index.ts:29-56`、`connector-gatewayapi-sms/src/index.ts:47-67`、`connector-mailgun/src/types.ts:61` & `index.ts:91-110`、`connector-oauth2`、`connector-oidc`、`connector-smtp`、`packages/core/src/routes/connector/config-testing.ts:29-96`
- **根因分析**：
  1. Core 的 `ssrfProtectedFetch`/`ssrfProtectedGot` 仅覆盖了 Webhook、企业 SSO 与 OIDC Provider，而 `packages/connectors/*` 各自直接调用裸 `got`/`ky`/`nodemailer`/`createRemoteJWKSet`，完全无视 `isSsrfProtectionEnabled` 与 `SSRF_ALLOWED_ADDRESSES`。调用 `POST /api/connectors/http-email/test` 甚至无需保存配置即可请求任意内网/云元数据地址，且在非 2xx 时将内网原始响应体放入 `400 connector.general` 原样返回。
  2. `connector-mailgun` 使用 `z.string().url().endsWith('.mailgun.net')` 校验完整 URL 字符串而非 `hostname`（如 `http://169.254.169.254/#.mailgun.net` 可直接绕过），且 `domain` 未限制路径字符（`../path#` 可逃逸 `/v3/` 路径）。
- **修复建议**：通过 `@logto/connector-kit` 的 `CreateConnector` 入参统一注入受 SSRF 保护的 HTTP 客户端/Agent；修正 `connector-mailgun` 校验解析后的 `URL.hostname` 与 `protocol === 'https:'` 并严格校验 `domain` 格式。

---

## 二、High 级漏洞与高危缺陷

### [H-01] `/oidc/auth` 的 `direct_sign_in` 参数未校验格式且使用 `path.join`，导致未授权开放重定向与 Windows 路径损坏
- **位置**：`packages/schemas/src/consts/oidc.ts:127`、`packages/core/src/oidc/utils.ts:404-410`、`packages/core/src/oidc/init.ts:346-352`
- **根因与修复**：`direct_sign_in` 仅校验 `z.string()`，随后执行 `'/' + path.join('direct', method, target)`。在 Linux 下传入 `direct_sign_in=..:\example.com` 会生成 `Location: /\example.com`（浏览器按外部域名解析触发开放重定向）；在 Windows 下正常请求也会生成反斜杠路径。应在 Schema 层限制 `/^(social|sso):[\w-]+$/` 并改用 URL 安全拼接。

### [H-02] 9 个官方社交/协议连接器默认开启未验证邮箱同步（`disableEmailSync` 默认为 `false`）且 5 个连接器无开关返回未验证手机号
- **位置**：`connector-azuread`、`connector-oauth2`、`connector-saml`、`connector-feishu-web`、`connector-wecom`、`connector-dingtalk-web`、`connector-naver`、`connector-facebook`、`connector-amazon`；以及 `packages/core/src/libraries/social.ts:218-224`
- **根因与修复**：上述连接器文档均注明上游不提供邮箱验证状态，但默认仍返回 `email`；且 `oauth2`/`saml`/`feishu`/`dingtalk`/`wecom` 无开关返回未验证 `phone`（`findSocialRelatedUser` 甚至优先匹配 `phone`）。应在 `SocialUserInfo` 引入显式 `emailVerified` / `phoneVerified` 字段，或在关联存量账号时强制要求验证存量账号凭据。

### [H-03] 登录体验页 `/social/landing/:connectorId` 未校验目标域导致开放重定向与 `sessionStorage` 污染窃取 OAuth 授权码
- **位置**：`packages/experience/src/pages/SocialLanding/use-social-landing-handler.ts:18-35`、`Callback/use-social-callback-handler.ts:25-34`、`containers/SocialSignInList/use-social.ts:230-307`
- **根因与修复**：该路由无需 OIDC 会话且 `isValidWebRedirectUri` 仅检查 `http:`/`https:`，不仅构成零点击开放重定向，还允许预先向同标签页 `sessionStorage` 植入自定义 `nativeCallbackLink`（Web 端发起社交登录时未清理残留键），使后续社交回调将未消费的 `code` 重定向至外部自定义 Scheme。应校验 `redirectTo` 必须与当前连接器授权域名匹配，并在 Web 社交登录发起时清除 `social_callback_data:<connectorId>`。

### [H-04] `SignInExperience` 的 `customContent` 未净化 HTML 且 URL 字段允许 `javascript:` 协议导致存储型 XSS
- **位置**：`packages/experience/src/Layout/AppLayout/CustomContent.tsx:22`、`packages/core/src/routes/sign-in-experience/index.ts:105-109`、`packages/experience/src/pages/ErrorPage/SupportInfo.tsx:40`、`packages/account/src/components/PageFooter/index.tsx:35`、`middleware/koa-security-headers.ts:163, 238, 273`
- **根因与修复**：`CustomContent` 直接渲染 `dangerouslySetInnerHTML`，且 `supportWebsiteUrl` / `termsOfUseUrl` / `privacyPolicyUrl` 仅使用 Zod `z.string().url()`（放行 `javascript:...`），配合默认 CSP 的 `'unsafe-inline'` 可在登录页与个人中心执行任意脚本窃取凭据与 `localStorage` 令牌。应对 `customContent` 使用 `DOMPurify` 净化，并为所有外部链接字段强制限定 `http:`/`https:` 协议。

### [H-05] Account Center `?redirect=` 外部开放重定向及 `/account/social/:connectorId/remove` 页面加载即自动解绑社交账号
- **位置**：`packages/account/src/utils/account-center-route.ts:152-160`、`pages/SocialFlow/index.tsx:199-208, 249-253`、`utils/social-flow.ts:24-29`
- **根因与修复**：`?redirect=` 接受任意外部 `http(s)` URL；且访问 `/account/social/:id/remove` 在 `useEffect` 中无确认弹窗直接发起 `DELETE` 解绑请求，若该连接器未绑定则报错并立即自动 `window.location.assign(redirect)` 触发零点击外部跳转。应将 `redirect` 限制在同源或已注册应用回调白名单内，并为独立 `/remove` 路由增加用户显式点击确认。

### [H-06] Account Center `/api/my-account/logto-configs` 与 `/mfa-verifications/backup-codes` 绕过字段级 `Off`/`ReadOnly` 权限控制
- **位置**：`packages/core/src/routes/account/logto-config.ts:44-50, 80-86`、`routes/account/mfa-verifications.ts:373-410`
- **根因与修复**：`logto-configs` 使用 `const passkeyControl = fields.passkey ?? fields.mfa` 统一鉴权整个请求体——当管理员将 `fields.mfa` 设为 `Off`/`ReadOnly` 而允许 `fields.passkey = 'Edit'` 时，普通用户仍可调用 `PATCH /logto-configs` 关闭自身 MFA 或设置 `skipMfaOnSignIn: true`（反之若 `passkey = 'Off'` 且 `mfa = 'Edit'` 则正常修改 MFA 会误报 400）；此外 `GET .../backup-codes` 完全漏检了 `fields.mfa`。应按 `body.mfa` 与 `body.passkeySignIn` 分别独立校验 `fields.mfa` 与 `fields.passkey`，并为 `GET .../backup-codes` 补齐 `fields.mfa` 可读校验。

### [H-07] Experience API 双路径绕过 Captcha 人机验证
- **位置**：`packages/core/src/routes/experience/verification-routes/password-verification.ts:275-321`、`classes/experience-interaction.ts:1450-1457, 1518-1530`
- **根因与修复**：(1) `POST /api/experience/verification/password` 未调用 `guardCaptcha()`（延迟至 `submit` 才检查），攻击者可在不解 Captcha 的情况下对海量不同账号做分布式撞库验证密码正误；(2) 验证任一攻击者自控的社交/SIWE/Passkey 记录会将交互全局布尔值 `captcha.skipped = true` 置位且在切换 `SignIn <-> Register` 时不重置，随后可免 Captcha 发送短信验证码或批量密码注册。应在密码验证入口调用 `guardCaptcha()`，并移除可变全局布尔值，改为仅在实际消费免验证类型的首因素记录时按记录类型豁免。

### [H-08] WebAuthn 注册缺失 `expectedRPID` 校验、Account API 跨用户复用 `verificationRecordId` 及未校验 `credentialId` 全局唯一性
- **位置**：`packages/core/src/libraries/verification-helpers/webauthn.ts:78-87`、`libraries/verification.ts:50-69`、`routes/verification/index.ts:357`、`routes/account/mfa-verifications.ts:219-253`、`routes/experience/classes/mfa.ts:346-360`
- **根因与修复**：(1) `verifyRegistrationResponse` 未传 `expectedRPID: rpId`，在配置了 `webauthnRelatedOrigins` 时可能接受子域 RP ID 却在入库时硬编码覆盖为主域 `registrationRpId`；(2) `buildVerificationRecordByIdAndType` 未校验 `record.userId === ctx.auth.id` 且消费后不删除记录；(3) 注册绑定时未调用 `findUserByWebAuthnCredential(credentialId)` 拦截重复凭据。应补齐 `expectedRPID`、强制绑定并单次销毁 `verification_records`、全局校验 `credentialId` 唯一。

### [H-09] `/api/user-assets` 与 `/me/user-assets` 拼接原始文件名导致存储路径遍历且允许公网可读 `image/svg+xml`（存储型 XSS）
- **位置**：`packages/core/src/routes/user-assets.ts:68-98`、`packages/core/src/routes-me/user-assets.ts:72-100`（对比已加固的 `routes/avatar-upload.ts:100-139`）
- **根因与修复**：两处上传接口直接拼接客户端传入的 `file.originalFilename`（含 `..` 可跨租户/跨目录覆盖路径），且未做文件魔数校验并允许 `image/svg+xml` 原样内联访问。应统一复用 `avatar-upload.ts` 中的 `sanitizeFilename`、文件头魔数校验，并对 SVG 强制附加 `Content-Disposition: attachment` 或限制上传类型。

### [H-10] 企业级 SSO 新用户注册未校验邮箱属于 `ssoConnector.domains`，导致跨域名抢注与越权触发 JIT 入组
- **位置**：`packages/core/src/routes/experience/classes/verifications/enterprise-sso-verification.ts:196-212, 291-303`、`classes/libraries/provision-library.ts:293-338, 698-718`、`oidc/scope.ts:98-105`
- **根因与修复**：`isEmailInSsoConnectorDomains` 仅在关联已有账号时检查，新用户通过企业 SSO 注册时完全未检查 IdP 返回的邮箱域名是否在 `connector.domains` 范围内（在多租户上游如 Google / Azure `/common` 或多客户 SAML B2B 场景下，连接器 A 可越权创建归属客户 B 域名的账号并触发连接器 JIT 入组）；同时 `provisionOrganizationsByEmailDomain` 与 `oidc/scope.ts`（`email_verified: Boolean(user.primaryEmail)`）未校验邮箱是否真正经过验证。应在 SSO 验证阶段统一强制校验 `connector.domains`，并记录真实的邮箱验证来源。

### [H-11] 旧版 `/api/interaction` 接口未归一化标识符即计算 Sentinel 哈希，导致大小写变形无限绕过防爆破锁定
- **位置**：`packages/core/src/routes/interaction/verifications/identifier-payload-verification.ts:197-203, 258-264`（挂载于 `routes/init.ts:133`）
- **根因与修复**：旧版接口仍在所有租户挂载生效，其直接对原始输入做 `sha256(identifier)` 而未将邮箱/不区分大小写用户名转为小写或规范化手机号，而底层查库不区分大小写，攻击者变换字母大小写即可获得 $2^k$ 倍爆破配额。应复用 Experience v2 的 `resolveLockoutTarget` 或下线废弃的 v1 密码/验证码校验路由。

### [H-12] `withSentinel` 先等待验证 Promise 执行数据库核销，再检查是否处于 `Blocked` 锁定态，导致正常用户一次性令牌与备用码被永久作废
- **位置**：`packages/core/src/routes/experience/classes/libraries/sentinel-guard.ts:161-195`
- **根因与修复**：`Password`、`VerificationCode` 与 `OneTimeToken` 共享首因素锁定池。攻击者只需对受害者邮箱故意输错密码触发锁定，受害者随后点击合法的 Magic Link / 邀请链接或输入正确验证码/MFA 备用码时，`withSentinel` 会**先在数据库中提交单次消费状态**，然后再抛出 `422 verification_blocked_too_many_attempts` 拒绝登录，导致单次有效凭据被永久销毁（且锁定期间仍继续在主线程运行 Argon2 哈希校验消耗 CPU）。应改为传入惰性回调 `() => Promise<T>`，在执行验证前先检查 `isBlocked`。

### [H-13] Redis TLS (`rediss://`) 默认关闭服务端证书校验 (`rejectUnauthorized: false`)，且集群模式根节点硬编码降级为明文 `redis://`
- **位置**：`packages/core/src/caches/index.ts:154-164, 222-226`
- **根因与修复**：`yes(url?.searchParams.get('reject_unauthorized'))` 在未传该参数时对 `null` 返回 **`false`**（与第 161 行注释写的默认 `true` 完全相反！），使所有默认 `rediss://` 连接暴露于中间人缓存投毒风险（可篡改自定义域名映射与登录配置）；且 `RedisClusterCache` 将 `rootNodes` 硬编码拼接为 `'redis://' + host`。应改为 `url?.searchParams.has('reject_unauthorized') ? yes(...) : true` 并保留原 `connectionUrl.protocol`。

### [H-14] 自托管多租户环境下 `/api/systems/license*` 未校验 `admin` 租户身份，允许普通用户租户越权读取全集群用量及覆盖全局许可证
- **位置**：`packages/core/src/routes/system.ts:144-238`、`routes/init.ts:95`
- **根因与修复**：虽然数据库层向普通租户角色回收了 `systems` 表权限，但 `systemRoutes` 挂载在所有租户的 `managementRouter` 上，且仅检查 `assertNotCloud()` 后便直接使用绕过 RLS 的 `EnvSet.sharedPool` 读写全局许可证并统计跨租户总用量（且 `PUT` 三次 `upsertSystem` 未包裹事务）。应强制断言 `tenant.id === adminTenantId` 并将写入包裹在单事务中。

### [H-15] OIDC 与 SAML 协议校验缺陷：`connector-apple`/`connector-oidc`/核心 `OidcConnector` 条件式跳过 `nonce` 校验、UserInfo 未比对 `sub`、SAML IdP 回调省略 `state` 绕过会话及 `@logto/cli` 命令注入
- **位置与要点**：
  1. **`if (payload.nonce)` 条件校验绕过**（`connector-apple/src/index.ts:80`、`connector-oidc/src/index.ts:119`、`core/src/sso/OidcConnector/utils.ts:202`）：请求时始终发送了会话 `nonce`，验签时却仅在令牌包含 `nonce` 字段时才校验；若提交不含 `nonce` 的 `id_token`（尤其 `connector-apple` 直接校验回调参数中的 `id_token`），会完全跳过 `getSession()` 会话绑定导致跨会话重放；且 `connector-oidc` 允许省略 `issuer` 校验。
  2. **Enterprise OIDC SSO 未校验 `userinfo.sub === idToken.sub`**（`core/src/sso/OidcConnector/index.ts:141-150`、`AzureOidcSsoConnector/index.ts:87-91`）：违反 OIDC Core 1.0 §5.3.4 防令牌替换要求。
  3. **SAML IdP 回调绕过与过期会话复用**（`core/src/routes/saml-application/utils.ts:18-35`、`queries/saml-application/sessions.ts:43-48`）：`GET /api/saml-applications/:id/callback` 在省略 `state` 参数时直接跳过 `_logto_saml_session_id` Cookie 校验（且生成非法的 `InResponseTo="null"` 与 `SessionNotOnOrAfter=""` XML 属性）；同时 `findSessionById` 未检查 `expires_at > now()` 与 `session.applicationId === id`。
  4. **`@logto/cli` Shell 注入与目录删除遍历**（`packages/cli/src/commands/connector/utils.ts:89-105`）：`execPromise(\`npm pack ${packageName} --json\`)` 使用 Shell 执行未转义参数，且解压包名仅替换了 `/` 未过滤 `..` 与 Windows `\` 即执行 `fs.rm(..., { recursive: true })`。应改用 `execFile('npm', ['pack', ...])` 并校验目标目录严格位于 `cwd` 内。

---

## 三、Medium 级并发竞态与逻辑缺陷

1. **[M-01] Token Exchange 单次模拟令牌 (`subject_tokens`) TOCTOU 并发重放 & 旋转 Refresh Token 无限滑动续命**（`oidc/grants/token-exchange/account.ts:35-39` & `index.ts:265-269`、`queries/oidc-model-instance.ts:54, 146-157`）：
   - `subject_tokens` 先普通 `SELECT` 判断 `!consumedAt`，历经多次异步查询与脚本执行后才无条件 `UPDATE consumed_at`，并发请求可一票多兑；应改为前置单条 `UPDATE ... WHERE id = $1 AND consumed_at IS NULL AND expires_at > now() RETURNING *`。
   - `consumeInstanceById` 在每次使用旋转 Refresh Token 时都会用当前时间覆盖 `consumed_at`；只要重放间隔小于 3 秒宽限窗，`consumed_at` 就会被无限向后推移，永远不会触发重放检测与 Grant 吊销；应改为 `SET consumed_at = COALESCE(consumed_at, now())`。
2. **[M-02] Token Exchange `actor_token` 校验不严与会话/封禁令牌吊销遗漏**（`token-exchange/actor-token.ts:30-37`、`libraries/session/index.ts:155-204`、`libraries/user.ts:236-244`）：
   - `actor_token` 使用子串 `includes('openid')` 判断 Scope，未校验 Actor 账号是否已被封禁/删除，也未校验签发给第一方应用；CIMD 每次授权新建 Grant 导致按 `session.authorizations` 吊销会话时遗漏同一会话早期创建的 CIMD Grant；`signOutUser`（封禁用户时调用）未清理未消费的 `AuthorizationCode` 与 `DeviceCode`。
3. **[M-03] 自托管脚本执行器继承宿主 `process.env`（泄露 `DB_URL` / `SECRET_VAULT_KEK`）且 Custom JWT 可覆盖 `organization_id` 与 `act` 声明**（`libraries/script-runner/pooled-worker.ts:82-86`、`oidc/init.ts:456-461`）：
   - 创建 `Worker` 时未传 `env: {}` 隔离宿主进程敏感环境变量；且 `init.ts:456-461` 将 `jwtCustomizedClaims` 放在对象展开最后一位，仅剥离了 `acr`/`amr`/`auth_time`，未保护 `organization_id` 与 `act`。
4. **[M-04] `getScopedProfile` 误展开数组导致 `GET / PATCH /api/my-account` 永远丢失 `ssoIdentities`**（`routes/account/utils/get-scoped-profile.ts:28-30, 55`）：
   - `...conditional(ssoIdentities)` 将数组展开为 `{ "0": ..., "1": ... }` 并被 `koaGuard` 响应守卫静默剔除，应改为 `...conditional(ssoIdentities && { ssoIdentities })`。
5. **[M-05] Account API MFA 完整性与大小写匹配缺陷**（`routes/account/mfa-verifications.ts`、`email-and-phone.ts`、`routes/verification/index.ts:109-111, 220-294`）：
   - 删除主邮箱/主手机号时未同步清理关联的邮箱/短信 MFA 因子导致下次登录死锁；删除最后一个常规 MFA 因子后遗留孤立 `BackupCode` 且未校验租户强制 MFA 策略；`POST /verifications/verification-code` 使用严格区分大小写的 `identifier.value !== user.primaryEmail` 判断新旧邮箱，导致大写注册邮箱用小写发起核身时丢失 `userId` 报权限拒绝；`/verifications/social` 漏加 `assertFirstPartyClient`。
6. **[M-06] 数据库更新构建器、管理端搜索/分页与订阅缓存异常**（`database/update-where.ts:48-92`、`libraries/subscription.ts:23-27`、`routes/applications/application.ts:144`、`middleware/koa-pagination.ts:77-85`、`queries/one-time-tokens.ts:127-160`）：
   - `buildUpdateWhereWithPool` 会静默剥离 `where` 中值为 `undefined` 的键；`SubscriptionLibrary` 在订阅周期刚结束时向 Redis 发送 `SET ... EX 0` 触发协议报错导致缓存雪崩；`koaPagination` 未限制 `.int()` 导致小数页码触发 PG `OFFSET` 500 错误；`GET /api/applications` 未捕获非法搜索模式抛出的 `TypeError`（500），且 `mode=posix` 非法正则触发 PG `2201B` 未映射为 400；`GET /api/one-time-tokens?status=active|expired` 过滤条件未考虑自然过期时间导致筛选失真。
7. **[M-07] 签名密钥轮换缓存与任务队列边界竞态**（`middleware/koa-auth/utils.ts:16`、`routes/logto-config/index.ts:110, 173, 223`、`job-queue/waiting-row-cap-cache.ts:129-156`、`queries/job-queue.ts:214, 325`）：
   - 跨租户 `admin` `jwksCache` 固定缓存 1 小时且无主动失效钩子；配置路由调用 `void tenant.invalidateCache()` 未 `await`；`WaitingRowCapCache` 在 5s TTL 过期瞬间并发穿透计数上限；`releaseClaimed` 归还因停机或断路器未实际执行的任务时未回退 `attempts` 计数。
8. **[M-08] 连接器凭据泄露、模板注入与短信发送损坏**（`connector-yunpian-sms/src/index.ts:115`、`connector-tencent-sms/src/index.ts:49-52`、`connector-aliyun-sms/src/index.ts:57-68`、`connector-linkedin/src/index.ts:118`、`connector-slack/src/index.ts:117`、`connector-smtp` / `connector-mailgun`）：
   - 云片连接器直接 `console.warn(..., error)` 打印 `got` `RequestError`，将 `options.form` 中的明文 `apikey` 与短信验证码打入标准输出日志；
   - 腾讯云与阿里云短信连接器仅剔除了 `payload.locale` 而未剔除新增的 `uiLocales`（及上下文对象），一旦 OIDC 请求带 `ui_locales` 即导致短信接口报模板参数不匹配或含非法连字符失败；
   - `connector-linkedin`（返回 `picture`）与 `connector-slack`（返回 `image`）字段名写错导致用户头像被静默丢弃；
   - `connector-smtp` 与 `connector-mailgun` 未对自定义模板中的动态 `sendFrom`/`replyTo` 调用 `parseSendFrom` 净化，且 `replaceSendMessageHandlebars` 未对组织名/邀请人名做 HTML 转义。
9. **[M-09] `@logto/tunnel` 与 `@logto/cli` 工具链缺陷**（`packages/tunnel/src/commands/tunnel/utils.ts:85-101, 136-138, 208-222, 254-263`、`deploy/utils.ts:89`、`packages/cli/src/commands/database/alteration/utils.ts:99-108`）：
   - `tunnel` 在重写 JSON 响应时漏判 `!Array.isArray(jsonData)`，将所有 JSON 数组响应破坏为 `{"0": ...}` 对象；`deploy --verbose` 在日志中明文打印具有 `all` 权限的 M2M Access Token；静态文件读取未在 `finally` 关闭文件句柄导致目录请求泄漏 FD；`/consent?app_id=...` 带参路径匹配失败；
   - `cli` 的 `rollback-to-timestamp` 未过滤已部署时间戳（对未执行过 `up` 的脚本执行 `down`），且未传参时 `Number('') === 0` 会尝试回滚全库所有历史迁移。

---

## 四、Low 级与工程健壮性问题

1. **[L-01] Webhook 响应体无字节上限读取 & `koaAppSecretTranspilation` 未捕获非法百分号编码**（`libraries/hook/utils.ts:21` & `index.ts:204`、`middleware/koa-app-secret-transpilation.ts:11, 64`）：
   - Webhook 投递与 `/test` 接口直接调用 `await response.text()` 将超大响应完整读入堆内存并写入 `logs` JSONB；`koaAppSecretTranspilation` 对 HTTP `Basic` 头调用裸 `decodeURIComponent`（畸形 `%` 抛 `URIError` 导致 500）且 `.split(':')` 会截断含冒号的应用密钥。
2. **[L-02] `Tenant.create` 半途异常泄漏 PostgreSQL 连接池 & 自定义域名反查顺序导致常规子域名请求每次触发 `domains` 全表扫描**（`env-set/index.ts:82-117`、`utils/tenant.ts:179-185`、`tables/domains.sql:14-18`）：
   - `envSet.load()` 在 `createPoolByEnv` 成功后若后续加载步骤抛错，未调用 `envSet.end()` 释放连接池；域名多租户下 `getTenantId` 先查 `domains` 表再匹配默认 `*.domain` 子域名，而未命中的域名不写缓存且 `domains` 表所有索引均以 `tenant_id` 开头，导致每次普通子域名请求都在 `sharedPool` 上执行顺序扫描（应先匹配 `*.domain` 并补充 `ON domains (domain) WHERE status = 'Active'` 部分索引）。
3. **[L-03] 跨平台与表主键一致性细节**（`packages/cli/src/connector/loader.ts:45, 51`、`middleware/koa-console-redirect-proxy.ts:20, 25`、`tables/oidc_model_instances.sql:19-21`）：
   - `loader.ts` 在 Windows 下缺少 `pathToFileURL` 导致绝对路径 ESM `import()` 报错；`koaConsoleRedirectProxy` 使用 `path.join` 在 Windows 下生成反斜杠重定向；`oidc_model_instances` 主键为全局 `(id)` 而 `upsertInstance` 冲突目标为 `(tenant_id, model_name, id)`，建议统一主键粒度并按需为 Secret Vault AES-GCM 绑定 `(tenantId, userId)` AAD。

---

## 五、首批安全加固与缺陷修复落地台账

以下高优与核心漏洞/缺陷已在仓库当前分支中完成修复并通过单元测试与类型/规范校验：

| 审计编号 | 修复状态 | 落地要点 |
| --- | --- | --- |
| **C-01** | **已修复**（首阶段） | `GET /api/authn/hasura` 在未提供 `unauthorizedRole` 且验签无 `sub` 时强制返回 `401 auth.unauthorized`，消除空凭证 `200 OK` 绕过 |
| **C-02** | **已修复** | `koaServeCustomUiAssets` 解码并拦截 `\0`/`\`/`..` 路径段与跨目录逃逸，修正 `max-age=604800`；`@logto/core-kit` `parseRange` 拦截 `end < start` 返回 `416` |
| **C-03** | **已修复** | `connector-kakao` 增加 `is_email_verified` Schema 校验并要求 `is_email_valid && is_email_verified` 方可信任邮箱 |
| **C-04** | **已修复**（核心项） | `connector-saml` 增加 `<saml:Audience>` 精确匹配 `entityID` 并校验 `XMLValidator.validate() !== true`；`SamlConnector/index.ts` 同步检查 `XMLValidator.validate()` 返回值 |
| **C-05** | **已修复**（Mailgun） | `connector-mailgun` 强制校验 `URL.protocol === 'https:'`、`hostname` 归属 `mailgun.net` 且 `domain` 不含路径遍历 |
| **H-01** | **已修复** | `buildLoginPromptUrl` 严格校验 `direct_sign_in` 段字符集并移除 `node:path` 反斜杠拼接，阻断开放重定向并修复 Windows 兼容性 |
| **H-03** | **已修复**（会话清理） | `@logto/experience` 在发起 Web 社交登录前主动清理残留 `social_callback_data:<connectorId>` |
| **H-04** | **已修复**（URL 协议） | `PATCH /api/sign-in-exp` 强制校验外部 URL 字段仅允许 `http:` / `https:` 协议，拦截 `javascript:` 存储型 XSS |
| **H-06** | **已修复** | `logto-configs` 按 `mfa` 与 `passkeySignIn` 独立校验 `fields.mfa` / `fields.passkey` 编辑权限；`GET .../backup-codes` 补齐 `fields.mfa` 可读校验与 OpenAPI 400 响应声明 |
| **H-08** | **已修复**（RP ID & 归属） | `verifyWebAuthnRegistration` 透传 `expectedRPID`；`buildVerificationRecordByIdAndType` 支持并强制校验当前登录 `userId` |
| **H-09** | **已修复**（路径净化） | `/api/user-assets` 与 `/me/user-assets` 对 `originalFilename` 执行 `path.basename` 与安全字符集清洗，阻断存储路径遍历 |
| **H-11** | **已修复**（邮箱归一化） | 旧版 `/api/interaction` 在上报 Sentinel 前对邮箱统一转小写，消除大小写排列防爆破绕过 |
| **H-13** | **已修复** | `RedisCache` / `RedisClusterCache` 默认开启 `rejectUnauthorized: true`（支持显式参数关闭），集群 `rootNodes` 保留 `rediss://` 协议 |
| **H-15** | **已修复**（Nonce & CLI） | `connector-apple`、`connector-oidc` 与 `sso/OidcConnector` 在会话存在 `nonce` 时强制要求 `id_token` 携带匹配 `nonce`；`@logto/cli` 改用 `execFile` + 包名白名单正则 + 子目录围栏校验 |
| **M-01** | **已修复** | Token Exchange 新增原子 `consumeSubjectToken`（`WHERE consumed_at IS NULL`）阻断并发重放；`consumeInstanceById` 对旋转 Refresh Token 使用 `COALESCE(consumed_at, now())` 杜绝无限滑动续命 |
| **M-04** | **已修复** | `getScopedProfile` 修正为 `...conditional(ssoIdentities && { ssoIdentities })`，恢复个人中心 `ssoIdentities` 返回 |
| **M-05** | **已修复**（邮箱大小写） | `POST /api/verifications/verification-code` 改用不区分大小写比对 `user.primaryEmail` |
| **M-08** | **已修复** | 云片连接器脱敏未知错误日志；腾讯云/阿里云短信连接器剔除 `uiLocales` 与非原始类型对象并支持通用模板回退；`connector-linkedin` 与 `connector-slack` 修正 `avatar` 字段名 |
| **M-09** | **已修复** | `@logto/tunnel` 修复 JSON 数组响应重写、`finally` 句柄关闭、非 GET/HEAD 返回 `405`、带参路径 MIME 与 `/consent` 识别、`deploy --verbose` 令牌脱敏；`@logto/cli` 拦截空字符串/非法回滚时间戳 |
| **L-03** | **已修复** | `@logto/cli` `loadConnector` 使用 `pathToFileURL` 修复 Windows ESM 动态导入；`koaConsoleRedirectProxy` 改用 `path.posix.join` |

---

## 六、二轮深度代码审查与前端 Token / 响应式 / UI-UX 全量 TDD 加固台账

经多子智能体二次逐行复审与全仓单元、组件浏览器及回归测试验证，进一步完成以下高价值架构、安全、高可用与前端体验修复：

1. **核心鉴权、高可用与存储安全（`@logto/core` & `@logto/core-kit`）**：
   - **Account Center 字段权限严密闭环**：`getAccountCenterFilteredProfile` 显式解构并按 `fields.social` 过滤 `ssoIdentities`（阻断 `...rest` 泄漏企业 SSO 身份及原始属性）；`logto-configs` 移除 `fields.mfa ?? fields.passkey` 反向回退（防止未启用 MFA 编辑时越权修改 MFA 配置）；`GET /my-account/mfa-verifications` 在 `fields.mfa = Off` 且 `fields.passkey` 可读时仅返回 `WebAuthn` 凭据。
   - **令牌核销与自定义 JWT 隔离**：`consumeInstanceById('RefreshToken')` 改为严格校验 `rowCount > 0`（阻断已吊销刷新令牌核销放行）；`consumeSubjectToken` 在 SQL 层补齐 `expires_at > now()` 原子校验；`PooledWorker` 启动参数增加 `env: {}` 隔离宿主进程敏感环境变量，并将 `organization_id` 与 `act` 纳入保留声明集合且后置合并 Logto 权威声明。
   - **数据库、分页、缓存与静态资源健壮性**：`buildUpdateWhereWithPool` 拦截 `where` 中 `undefined` 字段防止误扩更新范围；`koaPagination` 强制正整数与安全 `OFFSET` 上界；`EnvSet.load` 半途失败自动 `pool.end()` 释放连接池；OIDC/CIMD 配置变更路由改为 `await tenant.invalidateCache()`；订阅 Redis 缓存最小 TTL 下界设为 `1s` 避免 `EX 0` 报错；`parseRange` 锚定完整正则与安全整数并在 `koaServeCustomUiAssets` 中通过 `Promise.allSettled` 安全销毁异常流、裁剪 `Content-Range` 尾字节及放行 `/direct/*` 含点号目标路由；`user-assets` 统一跨平台安全文件名截断并拦截含 `<script>`/`<foreignObject>`/`on*`/`javascript:` 的高危 SVG 上传；`koaAppSecretTranspilation` 安全解码百分号并按首个冒号切分 `Basic` 凭证；`env-set/utils`、`cloudflare`、`koaSpaProxy` 全部统一为 `path.posix.join`。
2. **连接器、CLI 与 Tunnel 跨平台及边界加固**：
   - **`connector-azuread`**：使用 `appendPath(new URL(cloudInstance), tenantId)` 替代 `new URL(path.join(...))`，彻底修复 Windows 平台 `Invalid URL` 崩溃。
   - **`connector-apple` / `connector-oidc` / `connector-saml` / `connector-slack` / `connector-linkedin`**：`connector-apple` 仅对 `jwtVerify` 捕获映射 `SocialIdTokenInvalid`，保留会话缺失错误并兼容原生客户端自生成 `nonce`；`connector-oidc` 移除模块加载期静态 `new Date()` 默认值、前置展开 `customConfig` 防止覆盖 `state`/`nonce` 并补齐超时配置；`connector-saml` 在 `getAuthorizationUri` 增加 IdP Metadata XML 校验并兼容已有查询参数的 `redirectUri`；`connector-slack` 改用 `base64url` 解码与 `safeParse` 校验 `{ ok: true }`，并与 `connector-linkedin` 同步增加空会话防护。
   - **`connector-mailgun` / `connector-tencent-sms` / `connector-yunpian-sms`**：`connector-mailgun` 同步加固 `mailgunConfigGuard` 域名/端点校验并对 `subject`、`h:Reply-To`、`from` 剥离头部控制字符；`connector-tencent-sms` 固定位置参数提取顺序防止额外字段错位填充 `{1}`；`connector-yunpian-sms` 使用 `trySafe` 包裹 HTTP 400 错误体解析并补齐请求超时。
   - **`@logto/cli` & `@logto/tunnel`**：`rollback-to-timestamp` 仅回滚已部署的数据库变更并在 `try/finally` 中关闭连接池、拦截 `Infinity` 与毫秒级时间戳；连接器安装白名单禁止首字符 `-`/`~` 及反斜杠路径段并支持 `~` 语义化版本；`tunnel` 静态代理拦截目录路径返回 `404`、`HEAD` 请求免读文件体返回精确 `Content-Length`、`405` 补齐 `Allow: GET, HEAD`、多表单 HTML 全量替换并脱敏 `--verbose` 令牌日志。
3. **前端鉴权状态 Token、CSS 设计 Token、移动端响应式与 UI/UX 加固**：
   - **鉴权与构建状态**：`use-single-sign-on` 补齐原生 WebView 分支 `return` 早退及 Web 流残留回调链接清理；`handleSearchParametersData` 在 `/callback/*` 回跳时保留 `organization_id` 与 `ui_locales`；`UserInteractionContextProvider` 在 `setVerificationId` 内同步落盘 `sessionStorage` 消除跳转竞态；`CustomContent` 基于 `DOMParser` 剥离危险脚本标签与事件属性；`account/vite.config.ts` 归一化 Windows 路径分隔符确保 `@/` 别名转换生效；`@logto/elements` 修正个人资料接口路径为 `api/my-account`。
   - **CSS 设计 Token 与移动端交互体验**：修复 `@logto/core-kit`（`--font-display-1: 48px/56px`、`--color-all-100`、暗色 `--color-code-dark-bg-hover/pressed`）、`@logto/experience`（补齐亮色 `--color-neutral-99` 与亮暗 `--color-surface-1`）、`@logto/account`（`Sidebar`、`ConfirmModal`、`EditProfileFieldModal`、`CodeFlow` 未定义变量）、`@logto/elements`（`logto-identity-info` 与 `logto-profile-item` 变量拼写及 `display: flex`）及 `@logto/console` 6 处失效设计 Token；修复 `Account Center` 在 `<= 1060px` 视口下导航栏消失断层、多字段编辑弹窗 `100dvh` 内部滚动、移动端日期输入 `16px` 防 iOS 自动缩放、`320px` 窄屏 6 位验证码自适应间距与刘海屏安全区留白；修复 `TextLink` 仅在原生 WebView 劫持 `IframeModal` 并补齐 `noopener noreferrer`、`Consent` 空字符串条款链接判断、`useErrorHandler` `401` 重认证优先级以及备用码重新生成重试与 Passkey 预拉取异常恢复。

---

## 七、标准 OAuth 2.0 / OIDC PKCE (`S256`) 支持与第三方登录联调复审台账

针对标准 OAuth 2.0 / OIDC 第三方连接器（含 `shushu.fan` 真实联调验证）及关联 CLI / 前端模块完成全量 TDD 审查与加固：

1. **标准 OAuth 2.0 与 OIDC 连接器协议安全加固（`@logto/connector-oauth`, `@logto/connector-oidc`）**：
   - **端到端 PKCE (`S256`) 一致性**：在 `@logto/connector-oauth` 与 `@logto/connector-oidc` 同步支持 `enablePkce`（`generateCodeVerifier` + `generateCodeChallenge` `S256`、`setSession({ codeVerifier })` 及 Token 交换 `code_verifier` 校验），消除 `oidcConnectorConfigGuard` 继承后静默忽略 `enablePkce` 的安全隐患。
   - **HTTP/HTTPS Endpoint 协议守卫与 URL 合并**：新增 `httpUrlGuard` 校验 `authorizationEndpoint`、`tokenEndpoint`、`userInfoEndpoint` 与 `jwksUri`（阻断 `javascript:` 重定向 XSS 及非法 URL `500` 异常）；`constructAuthorizationUri` 改用 `new URL()` + `searchParams.set()` 安全合并已有查询参数。
   - **保留协议参数防污染与刷新令牌默认值修复**：新增 `sanitizeCustomAuthParameters` / `sanitizeCustomTokenParameters` 剥离 `customConfig` 中与 OAuth/OIDC/PKCE 冲突的保留键，并在 `ClientSecretBasic` / `ClientSecretJwt` 模式下剔除 `snake_case` `client_secret` 防止多认证凭据泄漏；`getAccessTokenByRefreshToken` 补齐 `configGuard.parse(config)` 确保缺省 `tokenEndpointAuthMethod` 正确回退；`token_type` 支持缺省/空值回退为 RFC 6750 `Bearer` 并拦截头部控制字符。
2. **CLI Windows 连接器挂载修复（`@logto/cli`）**：
   - `logto connector link` 在 Windows 下使用 `fs.symlink(path.resolve(packagePath), targetPath, 'junction')` 创建无管理员权限依赖的 NTFS Junction，并修复传入相对路径 `-p ./subpath` 时重复拼接目录段的问题（附 `link.test.ts` 单测）。
3. **前端外部回调会话保护、Console 表单状态与移动端 UI/UX（`@logto/experience`, `@logto/console`）**：
   - **外部 IdP 回调隔离**：`handleSearchParametersData` 在 `/callback/*` 外部回跳路由立即早退，防止上游第三方平台附带的 `app_id` / `organization_id` / `ui_locales` 污染 `sessionStorage` 导致会话校验失败。
   - **社交登录防连点竞态与布局优化**：`SocialSignInList` 与 `SocialLinkButton` 在跳转加载期间禁用重复点击（防止并发覆盖服务端 `codeVerifier` 与前端 `state`），修正加载态样式类名与无图标文本居中偏移。
   - **Console RHF 开关初始值与响应式布局**：`initFormData` 对缺省的 `Switch` 配置项初始化为布尔默认值（修复因 `removeFalsyValues` 剔除 `false` 导致的表单脏状态卡死）；`Switch` 补齐 `var(--color-white)`、`:focus-visible` 键盘焦点环与窄屏防挤压属性；`Connectors/Guide` 增加 `100dvh` 与 `<= 768px` 纵向响应式堆叠。
