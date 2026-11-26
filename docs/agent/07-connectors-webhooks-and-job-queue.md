# 07 — 连接器生态、Webhook 引擎与持久化任务队列

本章解析可插拔连接器（Connectors）的接口规范与运行时机制、31 种 Webhook 事件体系，以及基于 PostgreSQL 的高可靠异步任务队列（`@logto/job-queue`）。

---

## 1. 连接器架构 (`@logto/connector-kit` & `packages/connectors/`)

### 1.1 三大连接器类型与契约
所有连接器均实现 `CreateConnector<T>` 异步工厂，由 `@logto/core` 在启动时从 `packages/core/connectors/` 动态加载，并在每次请求中结合数据库 `connectors` 表配置实例化：
1. **社交登录连接器 (`ConnectorType.Social`)**：
   - 57 个官方包中包含 **4 个标准协议连接器**（`connector-oidc`、`connector-oauth2`、`connector-saml`、`connector-siwe`，其中前 3 个标注 `isStandard: true`，允许同一租户创建多个不同实例并自定义图标与名称）以及 **27 个主流平台连接器**（Google、Apple、GitHub、Azure AD、微信、飞书、钉钉、企微、支付宝、Discord、Slack、X 等）。
   - 核心方法：`getAuthorizationUri(payload, setSession)` 构造跳转地址并写入短期会话参数（`nonce`、`redirectUri`）；`getUserInfo(data, getSession)`（支持 Token Vault 的连接器额外实现 `getTokenResponseAndUserInfo` 与 `getAccessTokenByRefreshToken`）返回标准化的 `SocialUserInfo = { id, email?, phone?, name?, avatar?, rawData? }`。
   - **安全铁律**：Core 在社交登录关联已有账号（`findSocialRelatedUser`）时默认信任连接器返回的 `email` 与 `phone`。编写或修改任何社交连接器时，**必须在确认上游提供商已验证该邮箱/手机号归属（如 `email_verified === true`）的前提下才能返回 `email`/`phone` 字段**；若上游不提供验证状态，必须默认关闭邮箱/手机同步或要求显式配置开关！
2. **邮件连接器 (`ConnectorType.Email`，10 个官方包)** 与 **短信连接器 (`ConnectorType.Sms`，12 个官方包)**：
   - 核心方法：`sendMessage({ to, type: TemplateType, payload, ip }, inputConfig?)`。每个租户同一时刻仅保留一个激活的邮件连接器和一个激活的短信连接器。
   - **9 种消息模板用途 (`TemplateType`)**：`SignIn`、`Register`、`ForgotPassword`、`OrganizationInvitation`、`Generic`、`UserPermissionValidation`、`BindNewIdentifier`、`MfaVerification`、`BindMfa`。连接器查找模板时应使用 `getConfigTemplateByType(type, config)` 以自动回退至 `Generic` 模板。
   - **多语言自定义邮件模板回退链**：Core 向邮件连接器注入 `getI18nEmailTemplate`，按 `(type, 请求语言)` -> `(type, 租户默认语言)` -> `(Generic, 租户默认语言)` -> 连接器自身 JSON 配置模板 依次回退，并通过 `replaceSendMessageHandlebars` 替换 `{{code}}`、`{{link}}`、`{{application.name}}`、`{{organization.name}}`、`{{user.name}}` 等上下文变量。
   - **SMTP 邮件头防注入**：处理动态 `sendFrom` / `replyTo` 时，务必调用 `@logto/connector-kit` 导出的 `parseSendFrom`、`formatMailbox`、`stripHeaderControlChars` 剥离控制字符与尖括号。

---

## 2. Webhook 引擎架构 (`packages/core/src/libraries/hook/`)

### 2.1 三大类共 31 种事件 (`packages/schemas/src/foundations/jsonb-types/hooks.ts`)
1. **交互事件 (`InteractionHookEvent`，4 种)**：`PostRegister`、`PostSignIn`、`PostSignInAdaptiveMfaTriggered`（即使因触发 MFA 抛 `403` 也会在 `finally` 中照常投递）、`PostResetPassword`。
2. **数据变更事件 (`DataHookEvent`，24 种)**：覆盖 `User`、`TrustedDevice`、`Role`、`Scope`、`Organization`、`OrganizationRole`、`OrganizationScope` 的增删改及成员关系变动（成员变更数组超过 5000 条时自动截断并标记 `truncated: true`）。支持通过 `managementApiHooksRegistration` 路由映射表自动捕获响应体，或由业务代码调用 `ctx.appendDataHookContext` 手动追加。
3. **安全异常事件 (`ExceptionHookEvent`，3 种)**：`Identifier.Lockout`（Sentinel 触发锁定）、`Message.RateLimited`（短信/邮件触发限流）、`Grant.LimitExceeded`。

### 2.2 幂等标识与 HMAC 验签
- 每次投递生成全局唯一的 21 位 `deliveryId`（同时作为载荷字段与 `logs` 表主键 `TriggerHook.<event>`），方便接收方做幂等去重。
- 请求头携带 `logto-signature-sha-256`，值为使用当前 Hook 专属 `signingKey` 对**原始请求体字节串**计算的 `HMAC-SHA256` 十六进制摘要。
- 出站请求统一经由 `ssrfProtectedFetch` 发送，杜绝通过 Webhook 探测云主机内网。

---

## 3. 持久化任务队列引擎 (`@logto/job-queue` & `core/src/job-queue/`)

当开启 `isDevFeaturesEnabled` 时，Webhook 从请求内联投递切换至基于 PostgreSQL `jobs` 表的持久化异步任务队列（`packages/job-queue` 同时被 Core 与 Cloud 跨节点任务复用）：

```mermaid
flowchart LR
  Req["API 请求结束钩子<br/>enqueueWebhook"] -->|WaitingRowCapCache<br/>单Hook<=10k / 单租户<=50k| JobsDB[("PostgreSQL jobs 表<br/>payload 仅存非机密事件JSON")]
  JobsDB -->|claimDue 单条 CTE<br/>窗口公平分区 + FOR UPDATE SKIP LOCKED| Worker["JobQueueWorker<br/>单实例 100 / 单租户 20 / 单Hook 5"]
  Worker -->|实时查库获取 signingKey 与 url<br/>20s 超时 + ssrfProtectedFetch| Target["外部 Webhook 端点"]
  Worker -->|Fenced Settle CTE<br/>校验 (id, tenant_id, claimed_by, attempts)| Settle{"成功 / 重试 / 耗尽"}
  Settle -->|done / fail / >24h| Del["删除 jobs 行 + 更新 logs 终态"]
  Settle -->|408 / 429 / 5xx / 网络错误| Retry["释放 claimed_by + 指数退避(10s..4h)<br/>连续失败5次开启分组断路器 parkDueGroup"]
```

### 核心设计要点与红线
1. **Payload 零机密原则（Handler Contract Rule）**：
   - **严禁在 `jobs.payload` 中存储任何密钥、签名 Key、目标 URL 或可变鉴权头**（`defineJobHandler` 在编译期通过 `ForbiddenPayloadBrand` 拦截常见敏感字段名）。
   - Worker 执行时实时查询 `hooks` 表获取最新配置与 `signingKey`——既避免数据库队列行留存凭证，也保证管理员禁用/删除 Hook 或轮换密钥对所有待重试任务**立即生效**。
2. **双层等待行背压保护 (`WaitingRowCapCache`)**：
   - 入队前利用索引只读扫描（缓存 5s）限制单 Hook 最多积压 `10,000` 行、单租户最多积压 `50,000` 行等待任务；超限直接丢弃并写入审计日志，防止故障下游拖垮整库。
3. **多维公平抢占与无长事务租约 (`claimDue`)**：
   - 单个 SQL CTE 利用窗口函数同时满足全局（100）、单租户（20）、单分组（5）剩余并发槽上限，通过 `FOR UPDATE OF j SKIP LOCKED` 抢占任务并将 `next_attempt_at` 推迟 `60s`（租约期），随后**立即释放数据库连接**，HTTP 投递期间绝不占用连接池事务。
4. **围栏结算 (`Fenced Settle`) 与断路器 (`Circuit Breaker`)**：
   - 结算更新/删除均严格校验 `(id, tenant_id, claimed_by, attempts)` 四元组围栏，并在同一 CTE 内原子更新 `logs` 表审计记录（若日志因非法 Unicode 代理对等触发 PG 输入错误，自动降级剥离日志重试结算，防止毒丸任务死循环）。
   - 同一 Hook 连续可重试失败满 `5` 次即打开内存断路器，调用 `parkDueGroup` 批量清理超 24h 过期积压行并将同组其余等待行的 `next_attempt_at` 统一推迟至下一个探测时间点，之后每个退避周期仅放行 **1 个探测任务（Probe）**，探测成功后立即关闭断路器恢复全速消费。
