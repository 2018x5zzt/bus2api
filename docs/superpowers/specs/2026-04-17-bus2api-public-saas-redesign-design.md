# bus2api 公开 SaaS 前端重写 · 设计文档

| 项 | 值 |
|---|---|
| 日期 | 2026-04-17 |
| 范围 | 前端整体重写（产品定位转型） |
| 参考 | 内容：dragoncode.codes；风格：ohmygpt.com |
| 后端 | 沿用 `_sub2api_ref/backend`（Go + Gin + Ent + PostgreSQL + Redis） |
| 旧前端去向 | `frontend/` → `legacy-frontend/`（保留 2 周观察期后删除） |
| 新前端框架 | Nuxt 3 + Nuxt UI v3 + Tailwind v4 + Pinia + @nuxtjs/i18n + @nuxtjs/color-mode |

---

## 0. 背景与决策摘要

当前 `frontend/` 是面向企业内部的管理台，定位与参考站点（dragoncode、ohmygpt）不符。本次重写将产品定位由"企业内部控制台"转为"面向公网开发者/消费者的 API 中转 SaaS 平台"。

已拍板的核心决策：

- **产品定位**：公开 SaaS 平台（营销 + 模型广场 + 定价 + 注册登录 + 控制台）
- **首期范围**：标准集（营销首页 / 模型广场 / 定价 / 注册登录 / Dashboard / Keys / Usage / Billing / 个人设置 / 安全）
- **数据源**：对接 `_sub2api_ref` 后端 REST，不引入中间 BFF 层，不使用 mock/fallback
- **重写策略**：换技术栈到 Nuxt 3，新建 `frontend/`，原目录重命名为 `legacy-frontend/`
- **语言**：中文为主（`zh-CN` 默认）+ 英文；主题：亮/暗/系统三态
- **废弃契约**：`contracts/enterprise_bff_openapi_v2.yaml`；**新增** `contracts/sub2api_openapi_v1.yaml`

---

## 1. 信息架构（IA）

### 1.1 路由与渲染策略

**公开区（未登录可访问，利于 SEO）**

| 路由 | 渲染 | 说明 |
|---|---|---|
| `/` | prerender | Hero + Features + 模型亮点 + 定价预览 + 公告 + Footer CTA |
| `/models` | swr 600s | 按供应商分组的模型卡片，chip 展示 ctx/max/In/Out 价 |
| `/pricing` | swr 600s | 订阅套餐表 + 按量费率 + Show Details 切换 |
| `/announcements` | swr 300s | 公开公告列表 |
| `/announcements/:id` | swr 300s | 公告详情 |
| `/docs` | prerender | Quick Start 单页占位 |
| `/auth/login` | ssr | 登录（支持 2FA 分支） |
| `/auth/register` | ssr | 注册（邀请码/促销码/邮箱验证码） |
| `/auth/forgot-password` | ssr | 忘记密码（防枚举文案） |
| `/auth/reset-password` | ssr | 重置密码（校验 token） |
| `/auth/verify-email` | ssr | 邮箱验证落点 |

**控制台区（登录态，CSR 为主）**

| 路由 | 渲染 | 说明 |
|---|---|---|
| `/console` | ssr:false | 总览：KPI 三卡 + 趋势折线 + 模型饼图 + 公告入口 |
| `/console/keys` | ssr:false | Keys CRUD（新建后一次性展示明文） |
| `/console/usage` | ssr:false | 调用日志筛选 + 表格 + 详情 Drawer + 图表联动 |
| `/console/billing` | ssr:false | 订阅状态 + 进度 + 卡密兑换 + 历史 |
| `/console/profile` | ssr:false | 资料 + 改密 |
| `/console/security` | ssr:false | TOTP + 撤销全部会话 |

**MVP 非目标（显式说明）**：管理员后台、LinuxDo OAuth、博客/完整文档中心、除中英外第三语言、自建充值/支付网关、WebSocket 实时通知。

### 1.2 导航

- 公开区顶栏：Logo（左）+ 水平导航 `Models / Pricing / Docs / Announcements`（中）+ `主题切换 / 语言切换 / Sign In / Get Started →`（右）
- 控制台：固定左侧 Sidebar（Overview / Keys / Usage / Billing / Profile / Security）+ 顶栏 Logo + 账户菜单
- 移动端：公开区抽屉式；控制台 Sidebar 折叠为 hamburger

### 1.3 错误/特殊页

- `/404`、`/500` 统一视觉语言 + 返回首页 CTA
- `/console/**` 未登录 → `auth.global` 中间件重定向到 `/auth/login?next=<current>`
- `/auth/**` 已登录 → `guest-only` 中间件重定向到 `/console`

---

## 2. 视觉语言

### 2.1 色彩

- **中性基调**：`neutral 50..950`，承担背景/边框/文字
- **Primary**：`#0EA5B7` 深青蓝（单色，承担按钮主态、链接、进度条、数据 accent）；暗色模式 hover 提亮 10%
- **语义色**：`success` / `warning` / `danger` / `info` 仅用于反馈（toast、阈值标签），**不作装饰**
- **暗色模式**：`neutral-950` 背景 + `neutral-100` 文字；冷静克制，零彩色氛围填充

### 2.2 字体与排版

- 字体栈：`"HarmonyOS Sans SC", "PingFang SC", "Inter", ui-sans-serif, system-ui`；代码 `"JetBrains Mono", ui-monospace`
- 字号 token：`xs 12 / sm 13 / base 14 / lg 16 / xl 18 / 2xl 20 / 3xl 24 / 4xl 30 / 5xl 40 / 6xl 56`
- 落地页大标题：`6xl font-semibold tracking-tight`
- 行高：正文 1.6、UI 元件 1.4

### 2.3 圆角 / 描边 / 阴影 / 密度

- 圆角 token：`sm 6 / md 10 / lg 14 / xl 20`（卡片 `lg`、按钮 `md`、input `md`）
- **描边优先于阴影**：`border-neutral-200/60`（亮）、`border-neutral-800/60`（暗）
- 阴影：仅 dropdown/popover 用 `shadow-md`；卡片几乎零阴影
- 容器宽度：`max-w-6xl/7xl mx-auto px-4 lg:px-8`

### 2.4 组件清单（二次封装于 Nuxt UI 之上）

- 营销：`Hero` / `FeatureGrid` / `ModelGallery` / `ModelCard` / `PricingTable` / `PricingToggle` / `AnnouncementList` / `AnnouncementItem` / `BackgroundFlow`（可关闭）
- 控制台：`ConsoleShell` / `ConsoleSidebar` / `ConsoleTopBar` / `StatPill` / `KpiCard`
- Keys：`KeysTable` / `KeyCreateDialog` / `KeySecretReveal`
- Usage：`UsageFilter` / `UsageTable` / `UsageDetailDrawer` / `UsageChart`
- Billing：`SubscriptionCard` / `SubscriptionProgress` / `RedeemDialog` / `RedeemHistoryTable`
- Auth：`AuthForm` / `VerifyCodeField` / `PasswordField`
- Common：`AppLink` / `ThemeToggle` / `LocaleToggle` / `EmptyState` / `ErrorState` / `ForbiddenState` / `InlineAlert`

### 2.5 图标

- `@nuxt/icon` + Iconify；`lucide:*` 为主、品牌 Logo 用 `simple-icons:*`；线性 1.5px stroke

### 2.6 动效

- `transition-colors 150ms`
- 页面顶部 nprogress 细条
- 落地页 Hero 底部可选 CSS 流动渐变（可关）

### 2.7 主题切换

- `@nuxtjs/color-mode` 跟随系统，顶栏三态切换：`light / dark / system`

---

## 3. 技术栈 / 依赖 / 目录结构

### 3.1 运行与工具链

- Node ≥ 20.11
- `pnpm` 包管理（与 `_sub2api_ref` 一致）
- `nuxi build`（SSR）+ 分路由 prerender / ISR

### 3.2 核心依赖

| 类别 | 选型 |
|---|---|
| Meta framework | `nuxt@^3.14` |
| UI | `@nuxt/ui@^3`（含 Tailwind v4 + reka-ui） |
| Icon | `@nuxt/icon` + `@iconify-json/lucide` + `@iconify-json/simple-icons` |
| State | `@pinia/nuxt` + `pinia` |
| i18n | `@nuxtjs/i18n@^9`（策略 `prefix_except_default`） |
| Theme | `@nuxtjs/color-mode` |
| HTTP | Nuxt 内置 `$fetch` / `ofetch`（不引入 axios） |
| 图表 | `echarts` + `vue-echarts` |
| 表单 | `zod` + Nuxt UI 的 `UForm` |
| 日期 | `date-fns` |
| 类型生成 | `openapi-typescript` |
| 测试 | `vitest` + `@nuxt/test-utils` + `@vue/test-utils` + `jsdom` + `playwright` |
| Lint | `eslint` + `@nuxt/eslint` |

**刻意不引入**：axios、lodash、dayjs、moment、element-plus、ant-design-vue。`@vueuse/core` 按需使用。

### 3.3 目录结构

```
frontend/
├─ app.config.ts
├─ nuxt.config.ts
├─ tailwind.config.ts
├─ package.json
├─ pnpm-lock.yaml
├─ tsconfig.json
├─ assets/
│  ├─ css/tailwind.css
│  └─ brand/logo-*.svg
├─ public/                         # favicon / og-image
├─ components/
│  ├─ marketing/
│  ├─ console/
│  ├─ keys/
│  ├─ usage/
│  ├─ billing/
│  ├─ auth/
│  └─ common/
├─ composables/
│  ├─ useApi.ts
│  ├─ useAuth.ts
│  ├─ useModels.ts
│  ├─ usePricing.ts
│  └─ useUsageQuery.ts
├─ layouts/
│  ├─ default.vue
│  └─ console.vue
├─ middleware/
│  ├─ auth.global.ts
│  └─ guest-only.ts
├─ pages/
│  ├─ index.vue
│  ├─ models/index.vue
│  ├─ pricing/index.vue
│  ├─ announcements/index.vue
│  ├─ announcements/[id].vue
│  ├─ docs/index.vue
│  ├─ auth/
│  │  ├─ login.vue
│  │  ├─ register.vue
│  │  ├─ forgot-password.vue
│  │  ├─ reset-password.vue
│  │  └─ verify-email.vue
│  └─ console/
│     ├─ index.vue
│     ├─ keys/index.vue
│     ├─ usage/index.vue
│     ├─ billing/index.vue
│     ├─ profile.vue
│     └─ security.vue
├─ plugins/
│  ├─ echarts.client.ts
│  └─ api.ts
├─ server/
│  └─ api/
│     ├─ auth/
│     │  ├─ login.post.ts          # 代理 sub2api /auth/login，set httpOnly refresh_token
│     │  ├─ logout.post.ts         # 清 cookie + 代理 /auth/logout
│     │  └─ refresh.post.ts        # 读 httpOnly refresh_token → /auth/refresh → 回写 access_token
│     ├─ settings-public.get.ts
│     └─ announcements-public.get.ts
├─ stores/
│  ├─ auth.ts
│  └─ ui.ts
├─ types/
│  └─ api.d.ts                     # 由 openapi-typescript 生成
├─ utils/
└─ tests/
   ├─ unit/
   └─ e2e/
```

### 3.4 Nitro 渲染规则（`nuxt.config.ts`）

```ts
routeRules: {
  '/':               { prerender: true },
  '/models':         { swr: 600 },
  '/pricing':        { swr: 600 },
  '/announcements':  { swr: 300 },
  '/announcements/**': { swr: 300 },
  '/docs/**':        { prerender: true },
  '/auth/**':        { ssr: true },
  '/console/**':     { ssr: false },
}
```

### 3.5 与后端的集成

- **生产**：
  - `/api/auth/login|logout|refresh` → Nuxt Nitro server routes（用于在服务端读写 `httpOnly refresh_token`）
  - 其他 `/api/v1/**` → `nginx` 反代到 sub2api 后端（同域调用，免跨域）
- **开发**：`nuxt.config.ts` 的 `nitro.devProxy` 把 `/api/v1` 代到 sub2api dev server；`/api/auth/*` 由 Nitro 自身处理
- **鉴权**：`Authorization: Bearer <jwt>`。Token 存储策略：
  - `access_token`：客户端可读 cookie（`sameSite=lax`、`secure`），供 `$fetch` 拦截器在请求前注入 `Authorization`
  - `refresh_token`：由 Nuxt Nitro `server/api/auth/*` 收到后端响应时以 `httpOnly` 形式 set-cookie；前端 JS 不可读，仅用于 `POST /auth/refresh` 时由 Nitro 中转附加
  - 登出：客户端清 `access_token`；Nitro 代理清 `refresh_token`，同时调用后端 `/auth/logout`
- **类型**：从 `contracts/sub2api_openapi_v1.yaml` 生成 `types/api.d.ts`

### 3.6 质量门

- `pnpm typecheck`（vue-tsc）
- `pnpm lint`
- `pnpm test:unit`（vitest）
- `pnpm test:e2e`（playwright smoke：登录 → 创建 Key → 查看 Usage）
- `pnpm build` 成功

---

## 4. 契约映射 / 数据流 / 关键态

### 4.1 页面 → sub2api REST 映射

| 页面 / 功能 | 方法 路径 |
|---|---|
| 公开配置/品牌 | `GET /api/v1/settings/public` |
| 公开公告 | `GET /api/v1/settings/public`（banner 字段）；登录态走 `GET /api/v1/user/announcements` |
| 模型广场/定价费率 | `GET /api/v1/user/groups/available`、`GET /api/v1/user/groups/rates` |
| 注册 | `POST /api/v1/auth/register`、`POST /auth/send-verify-code`、`POST /auth/validate-invitation-code`、`POST /auth/validate-promo-code` |
| 登录 + 2FA | `POST /auth/login`、`POST /auth/login/2fa` |
| 忘记/重置密码 | `POST /auth/forgot-password`、`POST /auth/reset-password` |
| 会话 | `POST /auth/refresh`、`POST /auth/logout`、`GET /auth/me`、`POST /auth/revoke-all-sessions` |
| Dashboard | `GET /user/usage/dashboard/stats` `trend` `models` |
| API Keys | `GET/POST/PUT/DELETE /user/keys`、`GET /user/keys/:id` |
| Usage | `GET /user/usage`、`GET /user/usage/:id`、`GET /user/usage/stats`、`POST /user/usage/dashboard/api-keys-usage` |
| Billing - 订阅 | `GET /user/subscriptions`、`/active`、`/progress`、`/summary` |
| Billing - 卡密 | `POST /user/redeem`、`GET /user/redeem/history` |
| Profile | `GET /auth/me`、`PUT /user`、`PUT /user/password` |
| Security - TOTP | `GET /user/totp/status`、`GET /user/totp/verification-method`、`POST /user/totp/send-code`、`POST /user/totp/setup`、`POST /user/totp/enable`、`POST /user/totp/disable` |

**若后端缺字段的处置**：优先从 `/settings/public` 读取；仍缺 → 明显空状态暴露，**禁止 mock/fallback**，由后端补齐。

### 4.2 鉴权数据流

```
[Browser]──POST /api/auth/login (Nitro)──▶ 转发 sub2api /api/v1/auth/login
         ◀──{access, refresh, expires_in}──┐
Nitro set-cookie:                          │
  access_token  (sameSite=lax, secure)     │ 可被前端 JS 读取用于注入 Authorization
  refresh_token (httpOnly, sameSite=lax, secure) 仅服务端可见

[每个请求] $api.* → Authorization: Bearer <access>
  └─ 401 ──▶ 单航班 refresh（Promise 去重）
             → POST /api/auth/refresh (Nitro)
               Nitro 读 httpOnly refresh_token → 转发 sub2api /auth/refresh
               成功：回写新 access_token cookie，重放原请求
               失败：清两枚 cookie + 跳 /auth/login?next=...
```

- SSR 阶段：`useRequestHeaders(['cookie'])` 透传 Cookie
- 客户端阶段：`plugins/api.ts` 注入 interceptor

### 4.3 错误 / 空态 / 加载态

- **加载态**：列表/表格/图表用 `USkeleton`；顶部 nprogress
- **空态**：`EmptyState`（Icon + 标题 + 动作按钮，中英双语）
- **错误**：
  - 4xx 表单级：行内红字 + `UAlert`
  - 401：静默刷新；失败跳登录 + `toast "会话已过期"`
  - 403：页级 `ForbiddenState`
  - 5xx / 网络：页级 `ErrorState` + 重试按钮；**不静默吞错**

### 4.4 SEO / 元信息

- 公开页 `useSeoMeta({ title, description, ogImage })` 定制
- `@nuxtjs/sitemap` + `@nuxtjs/robots` 生成 sitemap/robots，仅包含公开路由
- `/console/**`、`/auth/**` 标记 `noindex, nofollow`

---

## 5. 发布策略 / 里程碑 / 回滚

### 5.1 里程碑

**M0 · 脚手架（0.5d）**

- `git mv frontend legacy-frontend`
- `pnpm dlx nuxi init frontend`，装配 Nuxt UI / i18n / color-mode / pinia / icon
- `nuxt.config.ts` routeRules + devProxy
- tailwind tokens + 色板 + 字体
- CI（lint/typecheck/unit）green

**M1 · 契约与 API 层（1d）**

- `contracts/sub2api_openapi_v1.yaml`（从 `_sub2api_ref/backend/internal/server/routes/*.go` 反推）
- `openapi-typescript` → `types/api.d.ts`
- `composables/useApi.ts` + 401 refresh + SSR cookie 透传
- 单测：refresh 去重、401 重试、401 失败跳转

**M2 · 认证流（1.5d）**

- 登录 / 2FA / 注册 / 忘记密码 / 重置密码 / 邮箱验证
- `middleware/auth.global.ts`、`guest-only.ts`
- e2e smoke：登录 → /console

**M3 · 控制台（3d）**

- Shell（Sidebar + TopBar + 主题/语言切换）
- Dashboard、Keys、Usage、Billing、Profile、Security（含 TOTP）

**M4 · 公开区（2d）**

- 首页、/models、/pricing、/announcements、/docs
- SEO / sitemap / robots

**M5 · 收尾（1d）**

- a11y pass（键盘、aria、焦点）
- Lighthouse：公开页 perf ≥ 90、a11y ≥ 95
- Docker 镜像 + nginx 反代样例
- M5 + 2 周观察期后删除 `legacy-frontend/`

**合计工期**：约 9 天（不含评审与联调缓冲）

### 5.2 回滚

- `main` 受保护；每个 M 独立 PR，不满意可 revert
- `legacy-frontend/` 保留 2 周观察期；nginx 可一键切旧前端

### 5.3 验收标准（MVP 可发布门）

- 功能：标准集所有页面走通 happy path，错误态不静默吞错
- 质量：`pnpm typecheck && pnpm lint && pnpm test:unit && pnpm test:e2e && pnpm build` 全部 green
- 性能：Lighthouse 公开页 perf ≥ 90、a11y ≥ 95、best-practices ≥ 95、seo ≥ 95
- 安全：无明文密钥进仓；session/refresh token 不在 JS 可读 cookie（refresh 首选 httpOnly）
- 可用性：亮/暗双主题 + 中英切换无断裂；移动端 360px 起不破版

---

## 6. 风险与决策记录

| 风险 | 应对 |
|---|---|
| sub2api 无 public 端点返回"模型定价/套餐"所需公开字段 | 优先从 `/settings/public` 消费；若仍缺，暴露空状态并在后端排期补；**不 mock** |
| 2FA 在 M3 内开发周期不足 | 若 M3 超期，将 TOTP 延至 M3+，但 `/console/security` 空位保留 |
| Nuxt UI v3 在个别交互组件（如复杂 Data Table）不够用 | 用 reka-ui 原语自研，不切回 Vue3 组件老生态 |
| Tailwind v4 与 Nuxt UI v3 的 preset 版本漂移 | 锁定两者组合版本在 `package.json`，CI 禁止自动升级 |
| 营销页 SEO 对比预期不达 | M5 观察期内补 sitemap/ogImage/H1 调优；后续可转 SSG |

---

## 7. 落地前提与外部依赖

- 后端 `_sub2api_ref` 可在本地以 `go run ./cmd/server` 启动并连接 PostgreSQL + Redis
- 存在可用的测试账号（dev DB 初始化脚本已在 `_sub2api_ref/backend/migrations`）
- 邮件发送（注册/找回密码/2FA 验证码）在 dev 环境可用日志适配器替代
- 浏览器目标：最新两版 Chrome / Edge / Safari / Firefox；iOS Safari 16+

---

## 8. 变更记录

- 2026-04-17：初版，本文件
