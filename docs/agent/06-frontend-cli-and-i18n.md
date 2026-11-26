# 06 — 前端应用矩阵、多语言体系与 CLI 工具链

本章涵盖五大前端应用（`experience`、`console`、`account`、`elements`、Demo Apps）的托管机制与开发规范、双包国际化架构，以及 `@logto/cli` 与 `@logto/tunnel` 的内部实现。

---

## 1. Core 托管 SPA 与零闪烁 SSR 注入机制

`@logto/core` 通过 `koaSpaProxy`（`packages/core/src/middleware/koa-spa-proxy.ts`）统一托管所有前端应用：
- **开发模式（`NODE_ENV !== 'production'`）**：自动将请求反向代理至各包本地 Vite Dev Server（`experience:5001`、`console:5002`、`demo-app:5003`、`account:5004`、`device-demo-app:5005`）。
- **生产模式（`NODE_ENV === 'production'`）**：直接服务 `node_modules/@logto/<pkg>/dist` 静态产物（静态哈希资源缓存 7 天，`index.html` 强制 `no-store` 读入内存供上游 SSR 中间件改写）。
- **SSR 预注入（消除首屏请求瀑布与主题闪烁）**：
  - **登录页 `koaExperienceSsr`**（`middleware/koa-experience-ssr.ts`）：根据 `_logto` Cookie 中的 `appId`、`organizationId`、`theme` 预取 `SignInExperience` 与对应语言词条，将 `customCss` 内联为 `<style data-custom-css>` 插入 `</head>` 前，并将 HTML 安全转义后的数据替换进 `index.html` 的 `window.logtoSsr = Object.freeze(...)`。
  - **个人中心 `koaAccountCenterSsr`**（`middleware/koa-account-center-ssr.ts`）：注入品牌色与暗黑模式配置至 `window.logtoSsr`，由 `packages/account/index.html` 内联脚本在首帧渲染前同步设置主题属性。
- **Bring-Your-UI 自定义界面托管**：当租户通过 `/api/sign-in-exp/default/custom-ui-assets`（或 `logto-tunnel deploy`）上传了自定义前端压缩包并配置 `customUiAssets` 后，`/` 请求将切换至 `koaServeCustomUiAssets` 从云端对象存储流式读取该租户的静态文件。

---

## 2. 各前端包核心架构与开发规范

### 2.1 `@logto/experience`（终端用户登录体验 SPA）
- **状态管理**：纯 React Context 分层（`PageContextProvider` -> `SettingsProvider` -> `UserInteractionContextProvider` -> `CaptchaContextProvider` -> `WebAuthnContextProvider` -> `StepUpContextProvider`），不引入 Redux 等外部状态库。
- **URL 参数持久化**：入口在 React 挂载前调用 `handleSearchParametersData()`，提取 `organization_id`、`app_id`、`ui_locales`、`confirm_redirect_policy` 存入 `sessionStorage`，并通过 `history.replaceState` 仅在地址栏保留 `app_id`（请求后端 `/api/experience/*` 时通过 `Logto-App-Id` 请求头传递，实现同浏览器多标签页不同应用独立登录会话）。
- **CSS 类名兼容约定**：`packages/experience/vite.config.ts` 在生产构建时固定 SCSS Module 命名规则为 `[hash:base64:5]_[local]`（单下划线），并在关键节点保留 `logto_*` 稳定类名，防止破坏存量租户编写的 `customCss` 选择器。

### 2.2 `@logto/console`（管理控制台 SPA）与 `CONVENTION.md` 强制规范
- **双模运行（OSS vs Cloud）**：
  - **OSS 模式（`!isCloud`）**：挂载于 `admin` 租户 `/console`，登录后直接获取 `default` 租户 Management API Token 管理单实例。
  - **Cloud 模式（`isCloud`）**：根路由承载多租户列表与计费，进入 `/:tenantId/*` 后通过 OIDC **Organization Token**（`urn:logto:organization:t-<tenantId>`）请求 `/m/<tenantId>/api/*`。
- **目录与组件分层规范（`packages/console/CONVENTION.md`）**：
  - 顶层保留目录职责严格区分：`ds-components/`（通用设计系统原子组件） vs `components/`（跨页复用的业务组件） vs `containers/`（应用级布局容器） vs `pages/`（路由页面）。
  - 页面内子标签页（Tabs）直接平铺在该页面根目录下（若页面同时包含页面专属 `components/`、`hooks/`、`utils/`，则归拢至 `tabs/` 子目录）；凡包含 `index.tsx` + `index.module.scss` 等多于 1 个文件的子组件，必须建立独立同名子文件夹。
- **React Hook Form 两条铁律（必遵，否则产生脏表单 Bug）**：
  1. **必须在远程 SWR 数据加载完成后再挂载调用 `useForm({ defaultValues: data })` 的表单子组件**，严禁在 `data === undefined` 时提前初始化 `useForm`。
  2. **入参 `null` 转空串**：后端数据库将空字符串存为 `null`；传入 `defaultValues` 前必须通过转换函数将所有可空字符串字段转为 `field ?? ''`。否则用户仅仅聚焦（Focus）一个值为 `null` 的 `<input>`，RHF 内部值就会从 `null` 变为 `''`，误触发 `isDirty = true` 弹出未保存提示！

### 2.3 `@logto/account`（个人中心 SPA）与 `@logto/elements`
- **源码级跨包共享**：`packages/account/vite.config.ts` 配置了 `@experience/` 路径别名与自定义 Vite 插件 `experienceAliasPlugin`，直接编译复用 `packages/experience/src` 中的表单输入、验证码、多语言组件与基础样式。
- **自动 Step-Up 状态恢复机**：当调用 `/api/my-account/*` 收到 `401 insufficient_user_authentication`（或客户端检测到 `auth_time` 即将过期）时，自动将待执行动作序列化至 `sessionStorage`（`phase: 'authorizing'`），发起带 `acr_values` 与 `max_age` 的 OIDC 重认证，回调 `/account?code=...` 后自动单次恢复提交原修改请求。
- **`@logto/elements`**：基于 Lit 3 构建的标准 Shadow DOM Web Components（`<logto-account-center>` 等），支持任意前端框架或通过 `@lit/react` 嵌入第三方业务系统。

---

## 3. 国际化（i18n）双包体系与同步流程

| 语言包 | 适用范围 | 内置语种数 | 类型约束与加载方式 |
| --- | --- | --- | --- |
| `@logto/phrases` | 管理控制台、Demo App、后端 API 错误消息（`errors:`） | 18 种 | `en` 为完整基准，其余语种类型为 `DeepPartial<LocalePhrase>`，缺失项运行时自动回退 `en` |
| `@logto/phrases-experience` | 登录体验页（`experience`）、个人中心（`account`） | 21 种 | 所有语种强制要求完整实现 `LocalePhrase`；支持租户通过 `custom_phrases` 表动态覆盖或新增语种 |

**修改文案标准工作流（`AGENTS.md` 规范）**：
1. 先在 `packages/phrases/src/locales/en/` 或 `packages/phrases-experience/src/locales/en/` 中新增/修改英文源词条。
2. 运行结构同步命令生成占位注释 `/** UNTRANSLATED */`：
   - `pnpm translate sync-keys -t all -pkg phrases`（或 `-pkg phrases-experience`）。
3. 将其他语言文件中对应的词条补齐准确翻译（配置了 `OPENAI_API_KEY` 时可运行 `pnpm translate sync -pkg phrases`，亦可直接人工/Agent 精确翻译所有语言文件），严禁残留未翻译的 `/** UNTRANSLATED */`（除非明确声明仅改源语言）。
4. 运行 `pnpm --filter @logto/phrases build`（或 `pnpm prepack`）重新编译语言包产物。

---

## 4. `@logto/cli` 与 `@logto/tunnel` 速查

- **`pnpm cli` (`@logto/cli`) 常用开发/运维子命令**：
  - `pnpm cli db seed [--swe] [--cloud] [--test]`：初始化数据库表、RLS 策略、默认/管理租户及初始密钥（`--swe` 在已初始化时安全跳过）。
  - `pnpm cli db alt list | deploy [next|<ver>] | rollback <ver>`：查看、执行或回滚数据库迁移（开发期测试未发版迁移使用 `pnpm alteration deploy next`）。
  - `pnpm cli db config get|set|rotate|trim <key>`：管理或轮换 `oidc.privateKeys`、`oidc.cookieKeys`。
  - `pnpm cli connector link [-p .] [--cloud] [--mock]`：将工作区 `packages/connectors/connector-*` 软链接至 `packages/core/connectors` 供本地运行加载。
- **`@logto/tunnel`**：
  - 本地开发自定义登录 UI 时，通过 `npx @logto/tunnel -p 9000 --endpoint https://<tenant>.logto.app --experience-uri http://localhost:4000` 将本地 UI 与远端 OIDC/Experience API 聚合在同一源下调试，并通过 `logto-tunnel deploy` 一键打包上传。
