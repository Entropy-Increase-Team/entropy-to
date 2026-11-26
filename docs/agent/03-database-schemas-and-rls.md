# 03 — 数据库 Schema、PostgreSQL RLS 多租户隔离与迁移规范

`@logto/schemas` 与 `@logto/core/src/database` 构成了项目的数据持久化核心。由于业务查询运行在 PostgreSQL **行级安全策略（Row-Level Security, RLS）** 之下，查询规划器的索引选择行为与常规超级用户连接截然不同，Agent 在涉及任何 SQL、索引或迁移开发时**必须严格遵守本章规范**。

---

## 1. 表初始化生命周期与多租户 RLS 隔离机制

### 1.1 表初始化顺序 (`packages/schemas/README.md`)
`logto db seed` 按以下顺序执行 `packages/schemas/tables/` 与 `src/models/` 下的 SQL：
1. `tables/_before_all.sql`：创建无继承权限的父角色组 `CREATE ROLE logto_tenant_${database} NOINHERIT;`。
2. 带有 `/* init_order = <number> */` 注释的表（如 `tenants` 为 `0`、`users` / `oidc_model_instances` 为 `1`、`logs` 为 `2`），按数字升序执行。
3. 其余 `tables/*.sql` 按文件名字母序执行。
   - **自动注入 RLS**：每执行完一个不含 `/* no_after_each */` 注释的表文件后，CLI 自动执行 `tables/_after_each.sql`（替换 `${name}` 为表名）。
4. `tables/_after_all.sql`：统一授权并锁定高敏系统表。

### 1.2 触发器自动填充与 `AS RESTRICTIVE` 行级安全策略 (`_after_each.sql` & `_after_all.sql`)
- **`BEFORE INSERT` 自动填充 `tenant_id`**（`_functions.sql:4-15`）：
  ```sql
  create trigger set_tenant_id before insert on ${name}
    for each row execute procedure set_tenant_id();
  ```
  当应用层 `INSERT` 省略 `tenant_id` 时，`set_tenant_id()` 通过 `select id from tenants where db_user = current_user` 自动填入当前连接所属租户 ID。
- **双重策略强制隔离**（`_after_each.sql:6-13`）：
  ```sql
  alter table ${name} enable row level security;

  create policy ${name}_tenant_id on ${name}
    as restrictive
    using (tenant_id = (select id from tenants where db_user = current_user));

  create policy ${name}_modification on ${name}
    using (true);
  ```
  - PostgreSQL 要求至少命中一条 Permissive 策略**且**通过全部 `RESTRICTIVE` 策略，并默认将 `USING` 同时作为 `INSERT`/`UPDATE` 的 `WITH CHECK` 条件。
  - 因此，即使代码显式传入其他租户的 `tenant_id`，也会被 `${name}_tenant_id` 策略直接拦截，从数据库内核层面杜绝跨租户读写。
- **系统表权限回收**（`_after_all.sql:27-34`）：
  - 从 `logto_tenant_${database}` 角色组回收 `tenants`、`systems`、`service_logs` 的全部权限，仅对 `tenants` 重新授予列级只读权限 `SELECT (id, db_user, is_suspended, tag)` 并配以 `db_user = current_user` 的 RLS 策略（彻底隐藏 `db_user_password`）。
- **双连接池边界**：
  - **租户池（`tenant.envSet.pool`）**：以 `tenants.db_user` 身份连接，处理 99% 的租户内业务读写，受 RLS 保护。
  - **管理共享池（`EnvSet.sharedPool`）**：以 `DB_URL` 表所有者身份连接，**绕过 RLS**！仅允许在系统启动自检、`TenantPool` 读取租户 DSN、全局 `systems` 配置、自定义域名路由反查及跨租户 `CoreJobQueue` 消费中使用。**凡使用 `EnvSet.sharedPool` 操作租户表，SQL 中必须显式硬编码 `WHERE tenant_id = ...` 围栏条件！**

---

## 2. 核心铁律：RLS 下的 Leakproof 索引约束与派生列模式

### 2.1 为什么普通函数索引在租户连接下完全失效？
在 PostgreSQL RLS 下，为了防止恶意函数通过报错或侧信道泄露未通过 RLS 过滤的行数据，查询规划器**仅允许完全由 `LEAKPROOF`（防泄漏）函数组成的谓词下推为 Index Cond**。
- 普通列等值/范围比较（`text =`、`timestamptz <`）是 `LEAKPROOF` 的。
- **`lower()`、`payload->>'key'`、`payload ? 'key'`、`LIKE` / `ILIKE` 均不是 `LEAKPROOF`！**
- 后果：如果建了表达式索引 `ON users (tenant_id, lower(primary_email))` 并在租户角色下查询 `WHERE lower(primary_email) = lower($1)`，规划器**只能用 `tenant_id` 前缀扫描该租户全表所有行**，逐行过滤表达式！更隐蔽的是，如果开发者用默认的超级用户连接执行 `EXPLAIN`，由于表所有者绕过 RLS，看到的计划是走索引的假象！

### 2.2 标准解决方案：派生列 + `BEFORE` 触发器 + 部分索引 (`packages/schemas/README.md:30-42`)
当需要对大小写不敏感字段或 JSONB 内部键进行高频检索时，**严禁新建表达式索引**，必须升级为物理派生列：
1. **列命名**：JSONB 提取列命名为 `payload_<key>`；小写折叠列命名为 `<column>_lower`（注意 Unicode 大小写折叠可能膨胀字节长度，如 `varchar(128)` 源列对应的 `*_lower` 应设为 `varchar(384)`）。
2. **触发器同步**：在该表自己的 `tables/<table>.sql` 中定义 `BEFORE INSERT OR UPDATE OF <source>, <derived>` 触发器函数（将 `<derived>` 也列入 `UPDATE OF` 以防外部直接篡改派生列）。
3. **注释声明**：在派生列上方添加 `/** ... Never written directly. */` 注释。
4. **读写分离**：仅在 `WHERE` / `JOIN` 条件中使用派生列，读取返回值始终取自原始列。
5. **部分索引命名**：命名为 `<table>__<col_a>_<col_b>`（索引名中省略 `tenant_id`，但索引列首列必须包含 `tenant_id`），并附加 `WHERE <derived> IS NOT NULL`。
6. **执行计划验证**：本地执行 `EXPLAIN` 前，必须先执行 `SET ROLE <tenants.db_user>;` 模拟真实租户角色！

**现役标准范例**：
- `packages/schemas/tables/users.sql:31-79`：`primary_email_lower`、`username_lower` + `users__set_lower_columns()`
- `packages/schemas/tables/oidc_model_instances.sql:11-63`：`payload_grant_id`、`payload_account_id`、`payload_uid`、`payload_user_code` + `oidc_model_instances__set_payload_keys()`
- `packages/schemas/tables/logs.sql:10-49`：`payload_user_id`、`payload_application_id`、`payload_hook_id` + `logs__set_payload_keys()`

---

## 3. Schema 代码生成与 JSONB 类型绑定

在 `packages/schemas/tables/*.sql` 中编写表定义时：
- 若某列（通常为 `jsonb`、`varchar` 枚举或 `bytea`）需要绑定自定义 TypeScript 类型与 Zod Guard，使用行内注释 `/* @use TypeName */`，例如：
  ```sql
  mfa_verifications jsonb /* @use MfaVerifications */ not null default '[]'::jsonb,
  ciphertext bytea /* @use BufferLike */ not null,
  ```
- 必须在 `packages/schemas/src/foundations/jsonb-types/index.ts` 中导出同名的 `TypeName` 类型与小驼峰命名的 `typeNameGuard` Zod 对象。
- 执行 `pnpm --filter @logto/schemas build`（内部调用 `./generate.sh`）即可重新生成 `src/db-entries/*.ts`。

---

## 4. Slonik 查询构建器与使用陷阱 (`packages/core/src/database/`)

`@logto/core` 在 `packages/core/src/database/` 与 `utils/sql.ts` 中封装了通用 CRUD 工厂：
- `convertToIdentifiers(Schema, withPrefix?)`：将驼峰字段名映射为带双引号的 `sql.identifier` Token。
- `convertToPrimitiveOrSql(key, value)` 自动转换规则：
  - **空字符串 `''` 会被自动转为 SQL `null`**！（这也是前端 Console React Hook Form 必须将 `null` 转回 `''` 的原因）。
  - 以 `_at`、`At` 结尾或名为 `date` 的数值字段会自动通过 `to_timestamp(value::float8 / 1000)` 转为 `timestamptz`。
  - `Buffer` 自动包装为 `sql.binary(value)`；普通对象自动 `JSON.stringify`。
- `buildInsertIntoWithPool`：自动剔除 `tenantId`、`createdAt`、`updatedAt` 交由数据库默认值与 `set_tenant_id()` 触发器生成。
- **`buildUpdateWhereWithPool` 高危注意事项**（详见 `09-code-and-security-review.md`）：
  1. **切勿在 `where` 对象中传入可能为 `undefined` 的属性值**！`connectKeyValueWithEqualSign` 会静默过滤值为 `undefined` 的键，导致 `WHERE` 条件缩水甚至退化为更新全租户数据（若唯一键为 `undefined` 则触发 `sql.join([])` 抛 500）。调用前务必对 `where` 参数做非空断言。
  2. `where` 中传入 `null` 会生成 `col = NULL`（SQL 中恒不命中），判断空值请手写 `sql` 模板使用 `IS NULL`。

---

## 5. 数据库迁移（Alterations）编写规范 (`packages/schemas/alterations/`)

每次修改 `tables/*.sql`（表、列、约束、触发器、索引）时，**必须同时在 `packages/schemas/alterations/` 下新增迁移脚本**：

1. **命名与不可变性**：开发期统一命名为 `next-<unix_timestamp>-<kebab-name>.ts`（发版时由 `update-next.sh` 自动将 `next` 替换为版本号）。**已合并的 Alteration 脚本严禁事后修改内容**，如需修正必须新建增量脚本。
2. **事务钩子分工**：
   - `beforeUp?(pool)` / `beforeDown?(pool)`：**在事务外执行**，专用于 `CREATE/DROP INDEX CONCURRENTLY` 与大表分批数据回填。由于 `up` 失败不会回滚 `beforeUp` 已提交的内容，重跑时 `beforeUp` 必须具备幂等/断点续跑能力（并发建索引除外，见下条）。
   - `up(connection)` / `down(connection)`：与迁移状态表更新在**同一事务**内执行，失败自动回滚。长耗时语句需先在事务内执行 `SET LOCAL statement_timeout = 0;`。
3. **并发建索引四条铁律**：
   - `tables/*.sql` 中写普通 `CREATE INDEX`；Alteration 脚本的 `beforeUp`/`beforeDown` 中写 `CREATE INDEX CONCURRENTLY` / `DROP INDEX CONCURRENTLY`（`up`/`down` 留空注释）。
   - **严禁添加 `IF NOT EXISTS`**！若中断残留了 `INVALID` 索引，重跑必须显式报错提醒运维处理，绝不能静默跳过坏索引。
   - **每个并发索引单独拆分为一个 Alteration 文件**，确保中断重跑只需清理单个失败索引。
   - 必须包裹在 `withoutStatementTimeout(pool, async (connection) => { ... })`（`alterations/utils/1792569975-statement-timeout.js`）中执行，避免被连接池默认 60s 语句超时中断。
4. **新建业务表必挂 RLS**：在 Alteration 中 `CREATE TABLE` 后，必须调用现有的 RLS 辅助逻辑绑定 `set_tenant_id` 触发器、启用 RLS、创建 `AS RESTRICTIVE` 租户策略并授予 `logto_tenant_${database}` 权限，否则新表与 `db seed` 产出的全量库结构不一致。
5. **大表回填（Backfill）铁律**：
   - 先在独立的前置 Alteration 中添加新列与触发器；在后续 Alteration 的 `beforeUp` 中分批回填。
   - **严禁写 `WHERE col IS NULL LIMIT 1000` 循环**（大表下会产生 $O(N^2)$ 重复扫描）；必须沿现有主键/索引按固定顺序做游标翻页（Keyset Pagination，`WHERE id > lastSeenId ORDER BY id LIMIT 5000`）并配合 `FOR NO KEY UPDATE SKIP LOCKED`。
   - 回填结束后必须执行一次缺失行计数断言，若剩余未填充行数不为 `0` 则抛错中止，防止在数据不完整时推进迁移状态。
6. **本地双库一致性校验**：CI 的 `main-alteration` 任务会将“全新 `db seed` 库”与“旧版库执行 `db alt deploy next` 后的库”及“`down` 回滚后的库”通过 `.scripts/compare-database.js` 进行表/列/索引/约束/触发器/策略全量比对，两者必须 100% 一致。
