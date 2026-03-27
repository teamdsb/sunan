# M1 里程碑执行计划

## 概述

M1（"我的"模块）拆分为 **4 个批次（Wave）**，每个 Wave 内部包含多个可并行的 **Work Stream（WS）**，每个 WS 可独立分配给一个 Codex 实例执行。

规格文档已全部完成，本计划从"编写测试"开始，遵循 SDD+TDD 流程。

---

## Wave 1：脚手架 + 认证（串行前置，2 个并行 WS）

> Wave 1 是所有后续工作的基础，必须最先完成。

### WS-1A：后端脚手架 + 认证

**分配给**：Codex 实例 A（后端）

**输入规格**：
- `docs/specs/common/api-conventions.md`
- `docs/specs/common/db-conventions.md`
- `docs/specs/wecom/token-cache-spec.md`
- `docs/specs/wecom/oauth2-spec.md`
- `docs/specs/common/auth-spec.md`
- `docs/specs/wecom/jssdk-spec.md`

**任务清单**：

1. **项目初始化**
   - [x] NestJS CLI 创建项目，TypeScript 5.x
   - [x] ESLint + Prettier 配置
   - [x] Jest + Supertest 测试框架配置
   - [x] TypeORM 连接 PostgreSQL 16（`.env.local`）
   - [x] Redis 连接（`ioredis`）
   - [x] 全局异常过滤器（统一错误响应格式）
   - [x] 全局响应拦截器（`{ data }` / `{ data, meta }` 包装）
   - [x] `X-Request-Id` 中间件
   - [x] Swagger 文档（`/api/docs`，仅 dev/test）
   - [x] 速率限制（`@nestjs/throttler`）
   - [x] `updated_at` 自动更新触发器函数（全局）

2. **企业微信 Token 缓存服务**
   - [x] 测试：`WecomTokenService` 单元测试（缓存命中/未命中、分布式锁竞争、Redis 降级）
   - [x] 实现：`WecomTokenService`（`getAccessToken`、`getCorpJsapiTicket`、`getAgentJsapiTicket`、`forceRefresh`）

3. **OAuth2 + JWT 认证**
   - [x] 测试：`AuthController` 集成测试（code→JWT、code 过期 401、非通讯录 403）
   - [x] 实现：`GET /api/v1/auth/wecom/callback`、`POST /api/v1/auth/refresh`、`GET /api/v1/auth/me`
   - [x] 实现：`JwtAuthGuard`、`RolesGuard`、`@Roles()`、`@CurrentUser()` 装饰器
   - [x] Migration：`wecom_users` 表

4. **JS-SDK 签名**
   - [x] 测试：签名算法单元测试（SHA1 拼接、corp/agent 两种类型）
   - [x] 实现：`GET /api/v1/auth/jssdk/signature`

**产出物**：后端项目骨架 + 完整认证链路（OAuth2 → JWT → Guard），`pnpm test` 通过。

---

### WS-1B：前端脚手架 + 认证

**分配给**：Codex 实例 B（前端）

**输入规格**：
- `docs/architecture/tech-stack.md`
- `docs/specs/my/state/store-structure.md`
- `docs/specs/my/state/auth-slice.md`
- `docs/specs/wecom/oauth2-spec.md`
- `docs/specs/wecom/jssdk-spec.md`

**任务清单**：

1. **项目初始化**
   - [x] Vite + React 18 + TypeScript 项目
   - [x] Ant Design Pro 6 + Ant Design 5 集成
   - [x] Redux Toolkit store 骨架（含 RTK Query baseApi）
   - [x] React Router 6 路由骨架（`/my/*`）
   - [x] Axios baseQuery（JWT 拦截器、401 跳转 OAuth）
   - [x] ESLint + Prettier
   - [x] Vitest + React Testing Library

2. **OAuth2 登录**
   - [x] 测试：`authSlice` 单元测试（登录/登出/token 存储/401 重定向）
   - [x] 实现：`authSlice`（RTK Query: `wecomCallback`、`refreshToken`、`getMe`）
   - [x] 实现：OAuth2 重定向 + state 防 CSRF
   - [x] 实现：JWT `localStorage` 存取（key: `sunan_token`）

3. **JS-SDK 初始化**
   - [x] 测试：`useWecomJsSdk` hook 测试（isReady、iOS/Android 差异）
   - [x] 实现：`useWecomJsSdk`（wx.config → wx.ready → wx.agentConfig）
   - [x] 实现：iOS 初始 URL 记录（`sessionStorage: sunan_initial_url`）

**产出物**：前端项目骨架 + 登录流程 + JS-SDK 就绪，`pnpm test` 通过。

---

## Wave 2：文件服务 + 引用数据（2 个并行 WS）

> 依赖 Wave 1 完成。Wave 2 内部两个 WS 无相互依赖，可并行。

### WS-2A：后端文件服务 + 引用数据 Migration

**分配给**：Codex 实例 A（后端）

**输入规格**：
- `docs/specs/common/file-upload-spec.md`
- `docs/specs/my/db/schema.md`
- `docs/specs/my/db/vessels.md`
- `docs/specs/my/db/vehicles.md`
- `docs/specs/my/db/personnel.md`
- `docs/specs/my/db/certificate-types.md`

**任务清单**：

1. **文件上传服务**
   - [x] 测试：`FileService` 单元测试（预签名 URL、回调写入、mediaId 转存）
   - [x] 测试：`FileController` 集成测试（presign→callback、类型/大小校验拒绝）
   - [x] 实现：`POST /api/v1/files/presign`、`POST /api/v1/files/callback`、`GET /api/v1/files/{ossKey}/download-url`、`POST /api/v1/files/from-wecom`
   - [x] Migration：`files` 表

2. **引用数据表**
   - [x] Migration：`vessels` 表
   - [x] Migration：`vehicles` 表
   - [x] Migration：`personnel` 表
   - [x] Migration：`certificate_types` 表
   - [x] Seeder：船舶 11 艘、车辆 1 辆、证书类型 12 种（`INSERT ... ON CONFLICT DO NOTHING`）

**产出物**：文件上传全链路可用 + 引用数据初始化完成。

---

### WS-2B：前端文件上传组件

**分配给**：Codex 实例 B（前端）

**输入规格**：
- `docs/specs/common/file-upload-spec.md`
- `docs/specs/wecom/jssdk-spec.md`

**任务清单**：

- [x] 测试：文件上传组件测试（presign → PUT → callback、进度、错误处理）
- [x] 实现：通用文件上传组件（presign API + OSS 直传 + callback）
- [x] 实现：`wx.chooseImage` + `wx.uploadImage` 拍照上传路径
- [x] 实现：文件预览调用 `wx.previewFile`

**产出物**：可复用的文件上传/预览组件。

---

## Wave 3：业务模块（最多 6 个并行 WS）

> 依赖 Wave 2 完成。Wave 3 是并行度最高的阶段——以下 6 个 WS 之间无依赖（除 WS-3E 依赖 WS-3C 和 WS-3D），可分配给不同 Codex 实例。

### WS-3A：后端 — 企业资料 CRUD

**分配给**：Codex 实例 C

**输入规格**：
- `docs/specs/my/api/enterprise-profile-api.yaml`
- `docs/specs/my/db/enterprise-profile.md`
- `docs/specs/common/api-conventions.md`
- `docs/specs/common/db-conventions.md`

**任务清单**：

- [x] 测试：`EnterpriseProfileController` 集成测试（列表分页、详情、创建含附件、更新、软删除）
- [x] 实现：Controller + Service + Repository
- [x] Migration：`enterprise_profiles` + `enterprise_profile_files` 表
- [x] 权限：普通员工只读，部门管理员本部门，系统管理员全权

---

### WS-3B：后端 — 企业制度 CRUD

**分配给**：Codex 实例 D

**输入规格**：
- `docs/specs/my/api/enterprise-policy-api.yaml`
- `docs/specs/my/db/enterprise-policy.md`
- `docs/specs/common/api-conventions.md`
- `docs/specs/common/db-conventions.md`

**任务清单**：

- [x] 测试：`EnterprisePolicyController` 集成测试（列表、详情、创建、更新、软删除）
- [x] 实现：Controller + Service + Repository
- [x] Migration：`enterprise_policies` + `enterprise_policy_files` 表
- [x] 权限：普通员工只读，管理员可上传更新

---

### WS-3C：后端 — 电子证照 CRUD

**分配给**：Codex 实例 E

**输入规格**：
- `docs/specs/my/api/certificate-api.yaml`
- `docs/specs/my/db/certificates.md`
- `docs/specs/common/api-conventions.md`
- `docs/specs/common/db-conventions.md`

**任务清单**：

- [x] 测试：`CertificateController` 集成测试
  - 按 `owner_type + owner_id` 分组查询
  - 分页、排序、筛选（按类型、临期状态）
  - 创建含附件（多态关联校验）
  - 更新、软删除
- [x] 实现：Controller + Service + Repository
- [x] Migration：`certificates` + `certificate_files` 表
  - `idx_certificates_owner(owner_type, owner_id) WHERE deleted_at IS NULL`
  - `idx_certificates_expiry(expiry_date) WHERE deleted_at IS NULL`

---

### WS-3D：后端 — 消息推送 + 船舶监控 + 用户设置

**分配给**：Codex 实例 F

**输入规格**：
- `docs/specs/wecom/message-push-spec.md`
- `docs/specs/my/api/ship-monitor-api.yaml`
- `docs/specs/my/db/ship-monitors.md`
- `docs/specs/my/api/settings-api.yaml`
- `docs/specs/my/db/user-settings.md`

**任务清单**：

1. **企业微信消息推送**
   - [x] 测试：`WecomMessageService` 单元测试（文本卡片构造、多人发送、invalidUser、重试）
   - [x] 实现：`WecomMessageService.sendTextCard()`（token 失效重试、网络超时 3 次重试间隔 30s）

2. **船舶监控**
   - [x] 测试：`ShipMonitorController` 集成测试（列表、创建/更新/删除、仅绑定 vessels）
   - [x] 实现：Controller + Service + Repository
   - [x] Migration：`ship_monitors` 表

3. **用户设置**
   - [x] 测试：`SettingsController` 集成测试（获取、更新、默认值）
   - [x] 实现：Controller + Service + Repository
   - [x] Migration：`user_settings` 表

---

### WS-3E：前端 — 企业资料 + 企业制度页面

**分配给**：Codex 实例 G（或复用 B）

**输入规格**：
- `docs/specs/my/state/enterprise-slice.md`
- `docs/specs/my/ui/enterprise-profile-page.md`
- `docs/specs/my/ui/enterprise-policy-page.md`

**任务清单**：

- [x] 测试：`enterpriseSlice` 单元测试（RTK Query 缓存、乐观更新）
- [x] 测试：`EnterpriseProfilePage` 组件测试（列表、详情、编辑表单）
- [x] 实现：`enterpriseSlice` + `EnterpriseProfilePage`
- [x] 测试：`EnterprisePolicyPage` 组件测试（文档列表、上传、`wx.previewFile` 预览）
- [x] 实现：`EnterprisePolicyPage`

---

### WS-3F：前端 — 电子证照 + 船舶监控 + 设置页面

**分配给**：Codex 实例 H（或复用 B）

**输入规格**：
- `docs/specs/my/state/certificate-slice.md`
- `docs/specs/my/ui/certificate-list-page.md`
- `docs/specs/my/ui/certificate-detail-page.md`
- `docs/specs/my/state/monitor-slice.md`
- `docs/specs/my/ui/monitor-page.md`
- `docs/specs/my/state/settings-slice.md`
- `docs/specs/my/ui/settings-page.md`

**任务清单**：

1. **电子证照**
   - [x] 测试：`certificateSlice` 单元测试（owner 分组、缓存）
   - [x] 测试：`CertificateListPage` 组件测试（三 Tab 船舶/车辆/人员、筛选、分页）
   - [x] 测试：`CertificateDetailPage` 组件测试（详情、附件、编辑）
   - [x] 实现：`certificateSlice` + `CertificateListPage` + `CertificateDetailPage`

2. **船舶监控**
   - [x] 测试：`monitorSlice` 单元测试
   - [x] 测试：`MonitorPage` 组件测试（列表、管理员配置/普通只读）
   - [x] 实现：`monitorSlice` + `MonitorPage`

3. **用户设置**
   - [x] 测试：`settingsSlice` 单元测试
   - [x] 测试：`SettingsPage` 组件测试（表单、保存反馈）
   - [x] 实现：`settingsSlice` + `SettingsPage`

---

## Wave 4：证书提醒 + 路由整合（2 个并行 WS）

> WS-4A 依赖 WS-3C（证照 CRUD）和 WS-3D（消息推送）完成。WS-4B 依赖 Wave 3 所有前端 WS 完成。

### WS-4A：后端 — 证书提醒引擎

**分配给**：Codex 实例 E 或 F（复用）

**输入规格**：
- `docs/specs/my/api/certificate-reminder-api.yaml`
- `docs/specs/my/db/certificate-reminders.md`
- `docs/specs/common/notification-spec.md`
- `docs/specs/wecom/message-push-spec.md`

**任务清单**：

- [ ] 测试：`CertificateReminderJob` 单元测试
  - 提醒生成：证书类 30 天、合同类 90 天
  - **边界日期**：阈值当天、前一天、已过期
  - 去重：`acknowledged` 不再推送，未确认每天重复
  - 通知路由：船舶→船务部+总经办、车辆→后勤部+总经办、人员→当事人+部门管理员
- [ ] 测试：`CertificateReminderController` 集成测试（列表查询、确认操作、权限）
- [ ] 实现：`CertificateReminderJob`（`@Cron('0 9 * * *')`）
- [ ] 实现：`CertificateReminderController` + Service
- [ ] Migration：`certificate_reminders` 表 + `idx_certificate_reminders_user_status`

---

### WS-4B：前端 — 提醒看板 + 路由整合

**分配给**：Codex 实例 G 或 H（复用）

**输入规格**：
- `docs/specs/my/state/reminder-slice.md`
- `docs/specs/my/ui/reminder-dashboard-page.md`
- `docs/specs/my/ui/page-map.md`

**任务清单**：

1. **证书提醒看板**
   - [ ] 测试：`reminderSlice` 单元测试（提醒列表、确认操作）
   - [ ] 测试：`ReminderDashboardPage` 组件测试（分类展示、确认交互、权限差异）
   - [ ] 实现：`reminderSlice` + `ReminderDashboardPage`

2. **路由与导航整合**
   - [ ] 整合所有 `/my/*` 子路由
   - [ ] 路由权限守卫（基于角色的页面访问控制）
   - [ ] 移动端适配验证（375px 最小宽度、44px 触控区域）

---

## 并行度总览

```
时间轴 →

Wave 1 ─────────────────────────────────
  WS-1A（后端脚手架+认证）  ████████████
  WS-1B（前端脚手架+认证）  ████████████
                                        │
Wave 2 ─────────────────────────────────┤
  WS-2A（后端文件+引用数据）  ██████████│
  WS-2B（前端文件上传组件）   ██████    │
                                        │
Wave 3 ─────────────────────────────────┤  ← 最高并行度：6 个 WS
  WS-3A（后端·企业资料）       █████    │
  WS-3B（后端·企业制度）       █████    │
  WS-3C（后端·电子证照）       ███████  │
  WS-3D（后端·消息推送+监控+设置）█████ │
  WS-3E（前端·资料+制度页面）   ██████  │
  WS-3F（前端·证照+监控+设置）  ████████│
                                        │
Wave 4 ─────────────────────────────────┤
  WS-4A（后端·提醒引擎）        ██████  │
  WS-4B（前端·提醒看板+路由）   ██████  │
```

**最大 Codex 并行数**：
- Wave 1：2 实例
- Wave 2：2 实例
- Wave 3：6 实例（最大并行度）
- Wave 4：2 实例

---

## Codex Prompt 模板

分配 WS 给 Codex 时，使用以下 prompt 结构：

```
你负责完成 {WS 编号} 的所有任务。

项目上下文：
- 阅读 CLAUDE.md 了解项目全局约定
- 阅读以下规格文档作为开发输入：{列出本 WS 的输入规格路径}
- 通用约定：docs/specs/common/api-conventions.md、docs/specs/common/db-conventions.md

开发流程：
1. 先阅读所有输入规格文档
2. 按 TDD 流程：先写测试（红灯）→ 再写实现（绿灯）→ 重构
3. 不得偏离规格定义的接口/字段命名
4. 如规格有歧义，在代码中留 TODO 注释标记，不要自行决定

任务清单：
{粘贴该 WS 的任务清单}

完成标准：
- 所有测试通过
- 代码通过 lint
- 如有 OpenAPI YAML，须通过 swagger-cli validate
```

---

## 合并策略

各 WS 在独立分支上开发，合并顺序：

1. **Wave 1**：`WS-1A` → `main`，然后 `WS-1B` → `main`（后端先合，前端基于后端接口）
2. **Wave 2**：`WS-2A` → `main`，`WS-2B` → `main`
3. **Wave 3**：按完成顺序逐个合并，Migration 冲突时按时间戳排序即可
4. **Wave 4**：`WS-4A` → `main`，`WS-4B` → `main`

合并前须在 `main` 上跑全量测试，确认无回归。

---

## 验收标准

每个 Wave 合并后：

1. `pnpm test` 全部通过
2. `swagger-cli validate docs/specs/my/api/*.yaml` 通过
3. 对应规格文档状态更新为"已实现"（在 `docs/specs/my/README.md` 中）
4. lint 零错误
5. Wave 4 额外：证书提醒边界日期场景全覆盖
