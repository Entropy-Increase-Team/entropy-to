# 04 — 协议引擎（OIDC / OAuth 2.1 / SAML / Enterprise SSO）、密钥保险箱与网络防护

本章梳理 `@logto/core` 的认证与授权协议栈实现细节，涵盖 `oidc/`、`saml-application/`、`sso/`、Custom JWT、Secret Vault 信封加密、私钥轮换以及出站 SSRF 防护。

---

## 1. OIDC Provider 深度集成 (`packages/core/src/oidc/`)

### 1.1 `node-oidc-provider` Fork 与隔离层
- `@logto/core` 依赖定制版 `github:logto-io/node-oidc-provider`（基于 v9，内置 CIMD Draft-02 与标准 `scope` 响应行为）。
- **唯一深层导入入口**：`packages/core/src/oidc/oidc-provider-internals.ts` 是全仓**唯一允许**直接导入 `oidc-provider/lib/...` 内部模块的文件，其余业务代码一律从该模块引用，确保未来升级 Fork 时只需调整一处。
- **签名算法**：支持 `RS256`、`PS256`、`ES256`、`ES384`、`ES512`（默认租户种子生成 `ES384` EC 密钥；初始化时通过 `envSet.oidc.jwkSigningAlg` 自动对齐 `clientDefaults.id_token_signed_response_alg`）。

### 1.2 `PostgresAdapter` 与内置客户端 (`oidc/adapter.ts`)
- **客户端模型 (`modelName === 'Client'`)**：只读适配器：
  - 内置免注册虚拟客户端：`demo-app`（Live Preview）、`account-center`（个人中心，开启 `alwaysIssueRefreshToken`）、`device-demo-app`（设备流预览）；以及 `admin` 租户的 `admin-console`（动态注入 `ADMIN_ENDPOINT` 与 `CLOUD_ENDPOINT` 回调地址）。
  - CIMD URL 客户端（`https://...`）：直接返回 `undefined`，交由 `oidc-provider` 原生 CIMD 解析器远程拉取元数据。
  - 注册应用：从 `applications` 表读取并转换为 OIDC 客户端元数据（SPA / Native 强制 `token_endpoint_auth_method: 'none'` 且强制 PKCE；Traditional / M2M / SAML 使用 `client_secret_basic`，并由 `koaAppSecretTranspilation` 中间件支持 `application_secrets` 多密钥轮换）。
- **令牌与会话模型**：统一持久化至 `oidc_model_instances` 表。
  - **Refresh Token 3 秒并发宽限窗**（`queries/oidc-model-instance.ts:35, 45-55`）：为避免 Next.js / Serverless 等无共享内存客户端并发刷新同一旋转 Refresh Token 时误触重放吊销，已消费的 Refresh Token 在 `3s` 内仍视为未消费。
  - **会话扩展表 `oidc_session_extensions`**：关联记录会话最近一次登录提交信息（`lastSubmission`）、客户端与账户关系，在 `session.destroyed` 事件中自动清理。

### 1.3 五大 OAuth 2.1 / OIDC 授权模式与组织令牌 (`oidc/grants/`)
1. **`authorization_code`**：标准授权码模式（非 `client_secret_basic` 客户端强制 PKCE）。通过自定义 `loadExistingGrant` 检查应用级访问控制（`appLevelAccessControlEnabled`）及客户端被移除的过期 Scope。
2. **`refresh_token`（`oidc/grants/refresh-token.ts`）**：在标准刷新能力上扩展了 **Organization Token（Logto RFC 0001）**：
   - 当请求携带 `organization_id` 且**不含** `resource` 时：校验原 Refresh Token 包含 `urn:logto:scope:organizations`、用户属于该组织、第三方/CIMD 应用已获该组织授权、且满足组织的 `isMfaRequired` 策略，签发 `aud = urn:logto:organization:<orgId>` 的 JWT 访问令牌，其 `scope` 为用户在组织内角色权限与请求 `scope` 的交集。
   - 当同时携带 `organization_id` 与 `resource` 时：签发对应 API Resource 的 JWT，权限收敛至该组织下授予的 API Scope，并通过 `extraTokenClaims` 注入 `organization_id` 声明。
3. **`client_credentials`（`oidc/grants/client-credentials.ts`）**：支持 M2M 访问普通 API Resource，以及携带 `organization_id` 签发 M2M 组织令牌（Logto RFC 0006，校验应用已关联至该组织并计算 `appsRoles` 权限）。
4. **`urn:ietf:params:oauth:grant-type:token-exchange`（RFC 8693 / Logto RFC 0005，`oidc/grants/token-exchange/`）**：
   - **仅限第一方应用**开启（`customClientMetadata.allowTokenExchange: true`），第三方应用严禁开启，且 `subject_token` 若为 Access Token 也强制校验签发自第一方客户端（防止将第三方受限令牌兑换为第一方全量权限）。
   - 支持三类 `subject_token`：
     - 管理端签发的单次模拟令牌（`subject_tokens` 表，`sub_` 前缀）；
     - 第一方应用签发的不透明或 `at+jwt` 访问令牌（显式校验 JOSE Header `typ: at+jwt` 与 `client_id` 声明，严防拿同签名密钥的 `id_token` 冒充 `access_token`）；
     - 用户创建的个人访问令牌（`personal_access_tokens` 表，`pat_` 前缀）。
   - 可选携带 `actor_token`（含 `openid` scope），在签发的 JWT 中注入 `{ act: { sub: actorId } }`。
5. **`urn:ietf:params:oauth:grant-type:device_code`（RFC 8628，`oidc/device-flow.ts`）**：面向无浏览器输入受限设备（CLI、智能电视、Agent），应用开启 `isDeviceFlow: true` 后生效，交互界面桥接至 Experience SPA `/device` 路由。

### 1.4 第三方应用授权（Consent）与 CIMD (`oidc/cimd/`)
- **第一方 vs 第三方应用**：第一方应用自动静默授予请求的合法权限；第三方应用（`isThirdParty: true`）展示手动 Consent 授权页（`/consent`），OP 级用户 Scope 受 `application_user_consent_user_scopes` 白名单限制，API / 组织资源 Scope 受对应 Consent 关系表及用户实际选定授权的组织列表（`application_user_consent_organizations`）双重裁剪。
- **CIMD（Client ID Metadata Document，适配 MCP / AI Agent 免预注册客户端）**：
  - 仅在 `cimdEnabled && isSsrfProtectionEnabled && ssrfAllowedAddresses.length === 0` 时启用（因为 `client_id` 是任意外部 `https://` URL，必须依赖无白名单豁免的 SSRF 防护）。
  - 强制锁定 `grant_types: ['authorization_code', 'refresh_token']`、剔除所有 Logto 内部私有元数据键、按租户全局 `cimd_*_scopes` 上限裁剪权限，且每次授权独立生成 `Grant`（不跨次复用会话 Grant），按 Grant 粒度绑定单个组织（`cimd_grant_organizations`）并留存客户端展示快照。

---

## 2. SAML 2.0 身份源 (`saml-application`) 与企业级 SSO (`sso`)

### 2.1 Logto 作为 SAML 2.0 IdP (`packages/core/src/saml-application/`)
- 将 SAML 2.0 协议桥接至内部 OIDC 认证管线：
  1. 外部 SP 向 `GET/POST /api/saml/:id/authn` 发起 `AuthnRequest`（前置执行 `assertSamlRequestWithinLimits` 限制解压后 `<= 16KB`、元素 `<= 128`、属性 `<= 256` 防御 XML 炸弹，按配置校验证书签名与 `ForceAuthn`）。
  2. 创建 `saml_application_sessions` 记录并种下 `_logto_saml_session_id` Cookie，重定向至内部 `/oidc/auth`。
  3. 登录完成后回调 `GET /api/saml-applications/:id/callback`，用授权码换取 `id_token` 与 `/oidc/me` 用户信息（校验 `sub` 一致），由 `samlify` 生成签名（及可选加密）的 SAML `<Response>`，通过自动提交的 HTML POST 表单（校验 `acsUrl` 仅限 `http:`/`https:` 并做完整 HTML 属性转义）发送至 SP 的 ACS 地址。

### 2.2 Logto 作为企业级 SSO SP (`packages/core/src/sso/`)
- 独立于社交连接器体系，存储在 `sso_connectors` 与 `user_sso_identities` 表，内置 6 种 Provider：`OIDC`、`SAML`、`AZURE_AD`（SAML）、`AZURE_AD_OIDC`、`GOOGLE_WORKSPACE`、`OKTA`。
- **SAML 安全加固**：`SamlConnector/utils.ts:204-214` 显式校验 `<saml:Audience>` 必须精确匹配当前连接器的 SP `entityId`（弥补 `samlify` 不校验 Audience 的缺陷），并支持每连接器独立 RSA-4096 密钥对签名 `AuthnRequest`。
- **SP-Initiated 与 IdP-Initiated SAML SSO**：`POST /api/authn/single-sign-on/saml/:connectorId` 根据是否存在 `RelayState` 区分标准 SP 发起流程与 IdP 主动发起流程（后者将断言存入 `idp_initiated_saml_sso_sessions` 并种下 `SameSite=Strict` Cookie 后跳转 OIDC 授权）。
- **企业邮箱域名接管与 JIT 自动入组**：
  - 若用户输入邮箱命中已启用 SSO 连接器的 `domains`，自动阻断普通密码/验证码/社交登录，强制引导跳转企业 IdP。
  - **JIT（Just-In-Time）组织编排**（`libraries/user.ts` & `provision-library.ts`）：支持按关联 SSO 连接器（`organization_jit_sso_connectors`）、邮箱域名（`organization_jit_email_domains`）或一次性令牌上下文自动将用户加入目标组织并授予 `organization_jit_roles`。

---

## 3. Custom JWT、Secret Vault 与私钥平滑轮换

1. **Custom JWT 定制器（`oidc/extra-token-claims.ts` & `libraries/jwt-customizer.ts`）**：
   - 在签发用户 `AccessToken` 与 M2M `ClientCredentials` JWT 时注入自定义声明，支持调用 `api.denyAccess(msg)` 实时阻断签发（返回 `access_denied`）。
   - 自动剥离用户令牌自定义返回值中的受保护认证上下文声明（`acr`、`amr`、`auth_time`）。
2. **Secret Vault 信封加密（`utils/secret-encryption.ts` & `tables/secrets.sql`）**：
   - 用于安全持久化第三方社交与企业 OIDC 连接器返回的 `access_token` / `refresh_token`（供业务应用通过 Account API Token Vault 按需拉取并自动刷新）。
   - 采用双层 **AES-256-GCM 信封加密**：主密钥 `SECRET_VAULT_KEK`（32 字节环境变量）仅用于加密每条记录随机生成的 32 字节数据加密密钥（DEK），DEK 再配合独立随机 12 字节 IV 加密令牌明文，分别存储 `encrypted_dek`、`iv`、`auth_tag`、`ciphertext`（均为 `bytea`）。
3. **OIDC 签名私钥平滑轮换（`libraries/oidc-private-key.ts`）**：
   - 密钥生命周期包含三态：`Next` -> `Current` -> `Previous`，在 `/.well-known/jwks.json` 中按 `[Current, Next, Previous]` 顺序暴露（使 `Current` 负责签发新令牌，同时提前向依赖方预热 `Next` 公钥并保留 `Previous` 验签存量令牌）。
   - 当配置了 `rotationGracePeriod > 0`（或 `PRIVATE_KEY_ROTATION_GRACE_PERIOD`）时，新密钥先进入 `Next` 阶段并设定 `signingKeyRotationAt`；到期后 `TenantPool` 健康检查自动触发租户重载，由 `promoteScheduledSigningKeyRotation()` 加行锁（`FOR UPDATE`）原子提升 `Next -> Current`。

---

## 4. 出站网络 SSRF 防护体系 (`packages/core/src/utils/outbound-request.ts`)

- **设计原理（防 DNS Rebinding / TOCTOU）**：不在发起请求前单独做前置 DNS 解析校验，而是在底层 TCP Socket 建立连接时（`guardSocket` 监听 `socket.once('connect')` 检查 `socket.remoteAddress`）直接调用 `oidc-provider` 的 `isSpecialUseIP` 拦截所有环回、私网、链路本地（含云厂商元数据 `169.254.169.254`）、多播及 IPv4 映射 IPv6 保留地址；即使发生多次跨协议 301/302 重定向，每一跳新建连接都会被逐跳拦截。
- **配置开关**：
  - Cloud 环境（`IS_CLOUD=1`）：强制开启且忽略任何白名单。
  - 自托管环境：默认开启；可通过 `SSRF_ALLOWED_ADDRESSES=10.0.0.0/8,127.0.0.1` 放行指定内网网段（推荐），或通过 `SSRF_PROTECTION_DISABLED=true` 完全关闭（开启白名单或关闭防护会自动禁用 CIMD）。
- **两大标准客户端封装**：
  - `ssrfProtectedFetch`：为 Node 内置 `undici` Dispatcher 挂载 `connect` Socket 守卫，供 `ky`（Webhook 投递）、`jose`（远程 JWKS）及原生 `fetch` 使用。
  - `ssrfProtectedGot`：为 `http.Agent` 与 `https.Agent` 重写 `createConnection` 挂载 `guardSocket`，供企业级 SSO 元数据拉取等 `got` 请求使用。
  - *注：当前 `packages/connectors/*` 下的独立连接器包尚未接入 `ssrfProtectedFetch`/`ssrfProtectedGot`，二次开发或暴露多租户连接器测试接口时需重点关注（详见 `09-code-and-security-review.md`）。*
