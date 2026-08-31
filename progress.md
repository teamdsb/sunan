---
status: operations
owner: planning
updated: 2026-08-31
replaces: []
replaced_by: []
---
# 进度日志

## 会话：2026-08-31（0.0.7 再次生产发布，阶段 27 后续修改）

### 阶段 28：部署调查与执行
- **状态：** completed
- 用户要求再次上线最新工作树修改，版本继续保持 `0.0.7`，不修改前端页面版本显示。
- 当前工作树在阶段 27 基础上继续修改，涉及自动提醒调度、证书对象权限/详情、提醒看板与附件、工作台布局/路由、样式、规格和手册；无新的 migration 文件，仍为 25 条。
- 本地门禁已完成：Web 60 文件/270 项、API 单测 24 套件/125 项、API 集成 18 套件/84 项；API/Web 构建、API lint、21 份 OpenAPI、276 份 Markdown 索引、版本与前端版本显示扫描、`git diff --check` 均通过。
- 生产预检通过；备份批次 `20260831211651` 的 PostgreSQL dump、配置归档和 Redis RDB SHA-256 全部通过，RDB 检查为 36 keys/30 expires，PostgreSQL `pg_restore -l` 读取 566 条目录行（551 条非注释项）。
- 源码批次 `20260831211740` 已原子切换，旧源码保留为 `/dev/sunan/sunan-source/backup-20260831211740`；本地/生产应用源码聚合指纹均为 `a499941235eb4d6323ff0b0d4ea1a8f47cf4a4b6f646c66a0cc3aba313d35e6f`，无敏感环境文件或生成目录。
- Node 20 生产镜像构建完成：API `sha256:87a83a70f86f7d6c7f0190a0699aad6de0c74a06b17b3a48ebe4effe7b0bf38b`（创建时间 `2026-08-31 21:22:39 +08:00`）、Web `sha256:4d0eae9f1851f0fd236e7bacc3c3ff2e906628f9f88a9892670aa274a2a35810`（`21:21:10 +08:00`）、Nginx `sha256:e50f75e1e8d13ba887394d3907ccdefc26408dca98ccf721f9b62f8507237d9d`；API 镜像版本 `0.0.7` 且 `dist/main.js` 存在。
- 新 API 一次性容器执行 migration/seed 成功，数据库仍为 25 条 migration；无一次性 API/Web/Nginx 容器残留。
- 已按 API→Web→Nginx 分阶段切换：API healthy、Web/Nginx running，Nginx `-t` 通过；运行容器摘要与构建摘要一致，旧摘要保留为 `sunan-api/web/nginx:rollback-20260831211740`。
- 独立生产复验通过：六个长期服务正常，live/ready 200，受保护证书接口未登录 401，`/`、`/my`、`/my/master-data`、`/my/certificates`、`/my/reminders`、`/office`、`/procurement`、`/workbench` 均 200，CSS/JS 资源 200，近 10 分钟 API/Nginx 错误标记为 0，TLS 至 2026-10-16，`sunan-wecom-callback-ip-sync.timer` enabled/active。
- 生产构建期间 `pnpm deploy` 输出 5 个弃用子依赖和 `xlsx` bin 警告但退出码为 0；随后 API 版本、启动产物、健康检查均实测通过。宿主机缺少 `pg_restore`，已改用只读 PostgreSQL 镜像完成同等目录校验。
- 企业微信 iOS/Android/桌面真实登录、授权和业务操作不能由 HTTP 自动化替代，继续保留为用户现场验收项。

## 会话：2026-08-31（证书对象、自动提醒与工作台布局）

### 阶段 27：已完成
- 用户确认执行：统一名称为“证书对象”；任务看板默认两行并自适应等高；自动提醒无需手动扫描；看板按用户相关证书真实显示；详情展示证照附件。
- 已完成根因核对：提醒调度仅每日 09:00，证照保存不触发扫描；提醒 DTO 缺少证照附件；工作台默认渲染全部模块。
- 已完成实现：保留 `/my/master-data` 与 `/workbench/master-data` 兼容路由并统一显示“证书对象”；任务看板默认两行、可展开/收起且已选模块置顶；证照新增/编辑异步触发提醒队列，后台启动即扫并每五分钟按时间桶去重；提醒看板按用户范围显示待处理/已逾期/已确认，详情返回证照字段和附件，支持预览/下载。
- 已补齐权限与时间规则：证书对象页面支持船舶、车辆、人员、设备的新增/编辑，维护动作仅对维护角色开放；普通用户只读有效对象，停用对象仅维护角色可见。所有可填写日期字段统一使用日期时间选择控件，后端拒绝 date-only 输入，前端按上海时间显示 `YYYY-MM-DD HH:mm`。
- 已补齐回归：提醒详情 mock 与附件断言、ReminderService 依赖夹具、调度器启动/周期/销毁测试、提醒时间桶测试和 PostgreSQL 详情附件集成断言。
- 新鲜门禁：`pnpm test:web` 60 文件/270 项；API 单测 24 套件/125 项；API 集成 18 套件/84 项（`TESTCONTAINERS_RYUK_DISABLED=true`）；`pnpm build`、API lint、21 份 OpenAPI、`node scripts/check-doc-index.mjs`（276 个 Markdown）、`git diff --check` 均通过。
- 手册 Markdown 与 DOCX 已更新并重生成；生成器报告 14 个章节、48 张正文图，LibreOffice 渲染为 94 页 A4，DOCX XML 结构校验通过。证照列表、新增/详情、证书提醒看板、证书提醒详情、设置和工作台首页截图仍需用户按新界面重拍后替换，尤其旧图仍显示底部“新增证照”和“按对象”分组。

## 会话：2026-08-31（0.0.7 再次生产发布，本轮修改）

### 阶段 26：部署调查与执行
- **状态：** completed
- 用户要求再次上线最新工作树改动，版本继续保持 `0.0.7`，不修改前端页面版本显示。
- 本轮新增改动覆盖证书/提醒页面及测试、工作台首页和导航、移动端样式、路由和操作手册/规格；当前工作树共有 64 个已跟踪改动文件及既有 migration/工具目录。
- 本地门禁已通过：Web 60 files/269 tests、API unit 23 suites/121 tests、API integration 18 suites/84 tests，API/Web build、API lint、21 OpenAPI、276 Markdown 索引、版本/前端显示/diff 检查全部通过。
- API unit 首次调用因 pnpm 参数转发错误导致 Jest 未找到测试，已改用直接 Jest 参数方式重跑并通过，不构成代码失败。
- 生产只读预检已完成；线上初始状态为上一轮 `0.0.7` 镜像和 25 条 migration。
- 生产预检通过：六个服务正常，当前 API/Web/Nginx 摘要为上一轮 `72c9f238...`/`9a799f3b...`/`ba4a0f99...`，Compose 配置哈希与本地一致，live/ready 200，敏感配置均 SET。
- 备份批次 `20260831064109` 完成：PostgreSQL dump 279,180 bytes、配置归档约 13 KB、Redis RDB 9,392 bytes；三份 SHA-256 全部通过，Redis RDB 检查显示 36 keys/30 expires；临时库恢复演练核对 25 migrations、4 users、3 certificates 后已删除。
- 源码批次 `20260831064406` 完成原子切换，旧源码保留为 `/dev/sunan/sunan-source/backup-20260831064406`；三个包版本均 `0.0.7`、25 个 migration，无敏感 `.env` 或生成目录；应用源码聚合指纹本地/生产均为 `a24d1f154ce8d9ff273c557d52ee00b8fe96ceb055aa5abaef059d49f3ba6a7d`。
- 镜像构建批次约 `20260831064802` 完成：API `sha256:43ea1c025fdb2c6b1ef015eb26a21f209ad2f12ce896dbc43f5d0b51dabb50d4`、Web `sha256:4998d5922ed18f83e048a215f81e5882cf39ddc2f446b10b5f5a22cf1c988fb7`、Nginx `sha256:347eda4abce5128681ded96a31868d987f58b2917c206540be0bc2ac376cee6f`；三张镜像标签保持 `0.0.7`，旧摘要已加 `rollback-20260831064406` 标签。API 构建有 `xlsx` bin 警告但退出 0，Node 20 入口校验通过。
- 一次性新 API 容器 migration/seed 完成，数据库保持 25 条 migration；API→Web→Nginx 分阶段切换完成，API healthy、Web/Nginx running、Nginx `-t` 通过，无自动回切。
- 独立新鲜复验通过：六个长期容器正常，证书提醒字段/索引存在，五个受保护 API 未登录均 401，17 条 SPA 直达路由和 8 个新资源公网 200，API live/ready 200，根域名 HTTP 301，TLS 至 2026-10-16，定时器 enabled/active，近 10 分钟 API/Web/Nginx 错误标记均为 0，无一次性容器残留。
- 验证脚本问题记录：首次 Redis 快照因 ACL `NOAUTH`，服务器宿主机无 Node，源码敏感文件正则误报 `.env.example`，一次性命令嵌套替换产生 shell 语法错误；均改用安全替代命令后通过，未改变业务数据。API unit 首次 pnpm 参数错误未运行测试，改用直接 Jest 参数后 23/121 通过。
- 阶段 26 已完成；本轮完整回滚点为源码 `/dev/sunan/sunan-source/backup-20260831064406`、镜像 `sunan-api/web/nginx:rollback-20260831064406`、备份批次 `20260831064109`。企业微信 iOS/Android/桌面真实登录与业务操作继续保留为用户现场验收项。

## 会话：2026-08-31（0.0.7 小改动再次生产发布）

### 阶段 25：部署调查与执行
- **状态：** completed
- 已重新读取 `planning-with-files-zh` 与 `verification-before-completion` 技能并恢复既有发布记录。
- 已确认 `main`/`origin/main` 位于 `8ddb3c3`；当前工作树包含 49 个改动文件和新的 `1710000024000-certificate-reminder-preferences.ts` migration。
- 用户明确本轮仍保持版本 `0.0.7`，且不修改前端页面版本显示；已写入本阶段边界。
- 生产只读预检通过：线上仍为上次 0.0.7 API/Web/Nginx 镜像、24 条 migration，Compose/live/ready/Web 正常，磁盘约 64 GB 可用；新 migration 为证书提醒字段与索引的幂等增量变更。
- 本轮版本/部署配置无需修改，前端源码未引用 `SUNAN_VERSION` 或 `0.0.7` 页面显示。
- Web 全量门禁出现 1 个失败：`src/router/AppRoutes.test.tsx` 的 `/my` 首页懒加载用例超时，59 files/263 tests 通过；API unit 23/121、API build、lint 和 Web build 通过。按系统化调试先隔离复现，未进入生产发布。
- 隔离 `/my` 用例约 1 秒通过；随后单独默认 Web 全量重跑 60 files/264 tests 通过，确认首轮失败为与其他门禁并行时的资源竞争，不改代码，改为分阶段执行。
- 本轮发布前门禁完成：API integration 18 suites/84 tests、API unit 23 suites/121 tests、Web 60 files/264 tests，API/Web build、API lint、21 OpenAPI、文档索引、版本和 diff 检查通过。
- 生产备份批次 `20260831031452` 已通过：DB dump 550 entries、配置归档、Redis RDB 及 SHA-256 校验；恢复演练核对 24 migrations/4 users/3 certificates，临时库已删除。
- 源码批次 `20260831031635` 完成完整上传、敏感文件/生成目录排除、25 migration 和应用源码 SHA-256 校验后原子切换；旧源码回滚点为 `/dev/sunan/sunan-source/backup-20260831031635`，运行容器尚未变化。
- 新镜像构建批次 `20260831031730` 完成：API `sha256:72c9f238...d284608`、Web `sha256:9a799f3b...0d36a15d`、Nginx `sha256:ba4a0f99...35079d0`，Node `v20.20.2`，三张镜像 OCI 版本均为 `0.0.7`；旧镜像已加 `rollback-20260831031635` 标签。
- 一次性新 API 容器已完成 migration/seed，数据库从 24 条升至 25 条；证书表新增 `reminder_enabled`、`reminder_recipient_user_id`，提醒索引 `idx_certificates_reminder_recipient` 存在，容器无残留。
- API→Web→Nginx 分阶段切换完成：API healthy、Web/Nginx running，运行摘要分别为 `72c9f238...d284608`、`9a799f3b...0d36a15d`、`ba4a0f99...35079d0`，Nginx `-t` 通过；自动回切未触发。
- 独立新鲜复验通过：六个长期服务正常，25 条 migration，5 个受保护 API 未登录均为 401，14 条 SPA 直达路由和 7 个关键新懒加载资源公网 200，API live/ready 200，根域名 HTTP 301，TLS 至 2026-10-16，定时器 enabled/active，近 10 分钟 API/Nginx 错误标记为 0。
- 本轮备份批次 `20260831031452` SHA-256 全部通过，Redis RDB 检查通过，PostgreSQL dump 由生产数据库镜像 `pg_restore -l` 读到 565 条目录项；新 migration 哈希与本地一致，前端产物扫描无 `0.0.7`/`SUNAN_VERSION` 展示文本，无临时容器残留。
- 验证脚本记录：公网首轮因临时文件删除命令被本地安全策略拦截，第二轮因 zsh `path` 变量覆盖 `PATH`，第三轮因 zsh 标量不按空格拆分；均未发起破坏性操作，改用无临时文件、`route` 变量和原生数组后完整通过。宿主机无 `pg_restore`，改用 `docker run --rm` 挂载只读备份目录完成目录校验。
- 阶段 25 已完成；完整回滚点为源码 `/dev/sunan/sunan-source/backup-20260831031635`、镜像标签 `sunan-api/web/nginx:rollback-20260831031635`、备份批次 `20260831031452`。企业微信 iOS/Android/桌面真实登录与业务操作继续保留为用户现场验收项。

## 会话：2026-08-31（保持 0.0.7 的新版本生产重发）

### 阶段 24：部署发现与发布执行
- **状态：** completed
- 已读取 `planning-with-files-zh` 与 `verification-before-completion` 技能并恢复既有规划文件。
- 已确认当前 `main` 与 `origin/main` 位于 `4a64066`，工作树保留上一轮证书闭环、全局日期时间、迁移、规格和手册更新；本次以该完整工作树为发布源。
- 用户要求保持 `0.0.7` 且不改前端页面版本显示，已写入发布边界。
- 已读当前部署手册、架构、企业微信切换 runbook、生产 Compose、环境变量示例和 Dockerfile；确认采用服务器源码构建，API 启动自动 migration/seed，发布前需先备份并保留源码回滚点。
- 已读部署索引、操作规范、服务器清单、环境变量、备份恢复、上线材料与可观测规范；确认生产实际使用 `deploy/docker-compose.yml`，本轮部署配置无差异。
- 版本真源全部维持 `0.0.7`，前端源码不需要新增版本展示；同标签重发将以镜像 ID、创建时间、源码批次和哈希作为不可变追踪证据。
- 生产只读预检通过：API/Web/Nginx 当前均为 0.0.7 且记录了旧镜像 ID，数据库 23 条 migration，Compose/关键环境变量/live/ready/Web 正常，近 30 分钟 API 错误为 0，根盘约 66 GB 可用。
- 新 migration 审计确认只从 `shipping_voyage_approval_v1` 幂等复制 v2 模板并把 `departureAt` 输入类型改为 datetime；down 只删除对应 v2，无删除历史业务记录。
- 本机 Docker daemon 不可用；按 `systematic-debugging` 确认 Docker.app 存在但进程/socket 不存在，判定为 Docker Desktop 未启动的环境问题。
- 已启动 Docker Desktop并确认 client/server 均为 29.6.1；Web 60 files/264 tests、Web build、API lint、API build 已新鲜通过。
- API unit 首轮因命令额外分隔符把 `--runInBand` 当作匹配模式，未运行用例；已确认是命令调用错误，改用直接 Jest 参数重跑，不把该结果记为代码失败。
- API unit 新鲜重跑 23 suites/121 tests 通过；API integration 串行新鲜运行 18 suites/83 tests 全部通过，包含新增 migration、工作平台、证书、提醒、采购和日期时间回归。
- 21/21 OpenAPI、276 份 Markdown 索引、版本一致性、前端无版本显示引用和 `git diff --check` 通过；本地发布前门禁完成。
- 生产备份批次 `20260831010322` 已完成并验证：DB dump 550 entries、配置归档、Redis 时间点 RDB 和 SHA-256 均通过；dump 临时库恢复演练核对 23 migrations/4 users/3 workbench records/40 templates，临时库已删除。
- 源码批次 `20260831010442` 完成完整上传、敏感文件/生成目录排除、24 migration 和关键 SHA-256 校验后原子切换；旧源码回滚点为 `/dev/sunan/sunan-source/backup-20260831010442`，运行容器尚未变化。
- 镜像批次 `20260831010555` 使用生产 Dockerfile/Node 20 构建 API/Web/Nginx 0.0.7；新旧镜像 ID 已记录，旧 ID 已加 `rollback-20260831010442` 标签，新 API 含编译 migration、Web 有 101 个资源，构建后运行容器未变化。
- 已用新 API 一次性容器先执行第 24 条 migration 和幂等 seed，确认航次 v2 模板/日期时间字段生效且旧 API 持续健康；无 one-off 容器残留。
- API 切换批次 `20260831010959` 已通过 50 秒健康门禁：新 ID 运行、24 migrations、live/ready/依赖/401 正常、近 5 分钟错误 0，未触发自动回切。
- Web 切换批次 `20260831011122` 通过：新 ID 运行，容器/Docker 网络及 7 个关键懒加载资源正常，错误 0，未触发自动回切。
- Nginx 切换批次 `20260831011226` 通过：新 ID 运行，配置、12 路由、7 资源、live/ready/401、TLS 及本次 5xx/错误门禁通过，未触发自动回切。
- 首轮独立复验的远端脚本因最终 Compose 命令工作目录错误退出 1，本机外部 smoke 因 zsh 字符串不拆分导致 URL 拼接错误；均属验证脚本问题，生产核心断言已通过但整轮不采信，修正后重跑。
- 修正后独立复验完整退出 0：生产运行本次新 API/Web/Nginx ID，六个服务正常、24 migrations、源码指纹、备份/RDB/恢复证据、回滚点、无残留、证书/timers 和日志门禁通过。
- 本机外部公网复验完整退出 0：12 条真实 SPA 路由、7 个关键新资源、live/ready、401 与根域名 301 通过；近 10 分钟 API/Web 错误和 Nginx 最近 300 条 5xx/错误均为 0。
- 最终版本仍为 `0.0.7`，未修改前端页面版本显示。回滚源为 `/dev/sunan/sunan-source/backup-20260831010442`，回滚镜像标签为 `sunan-api/web/nginx:rollback-20260831010442`，数据/配置/Redis 备份批次为 `20260831010322`。
- 企业微信 iOS/Android/桌面真机登录与业务操作保留为用户现场验收项，未用浏览器或 HTTP smoke 冒充完成。

## 会话：2026-08-30（证书闭环与全局日期时间收口）

### 阶段 23：实现、验证与交付
- **状态：** completed
- 已读取 `systematic-debugging` 和 `planning-with-files-zh` 技能，恢复既有规划文件并核对未提交工作区。
- 已定位证书/提醒的主要前后端、集成测试与规格文件，并初步发现证书表单仍使用 date-only 控件。
- 已完成根因跟踪与修复：证书详情编辑表单缺少对象/类型/编号等字段，分组接口使用占位统计，提醒扫描只按部门 ID/名称匹配，航次 schema 与前端日期/船舶字段缺少可选控件；已分别在详情表单、证书服务、提醒引擎和工作平台 schema/页面修复。
- 已将证书创建、编辑、采购、工作平台及其他用户可填写日期统一为日期时间控件，前端提交 ISO 日期时间，后端新增 `IsDateTimeString` 并拒绝 `YYYY-MM-DD`；自动补值的会议留存期限和培训完成时间也改为 ISO 日期时间。历史 `DATE` 字段写入统一按 `Asia/Shanghai` 日历日期转换，避免 UTC 跨日。
- 已补充并更新证书、工作平台、主数据、采购集成/组件测试，证书 date-only 400 与有效 ISO date-time 用例通过。
- Docker daemon `29.6.1` 可用；API integration 18 suites/82 tests 通过，包含 certificate、certificate-reminder、workbench 与 procurement 相关套件。
- API lint 通过；API unit 23 suites/119 tests 通过；Web 60 files/264 tests 通过；Web/API production build 通过。
- `certificate-api.yaml`、`procurement-order-api.yaml`、`procurement-report-api.yaml` 均通过 Swagger 校验；`node scripts/check-doc-index.mjs` 通过（276 个 Markdown）；`git diff --check` 通过。
- 已重新生成 [苏南船舶管理系统操作手册.docx](/Users/yuan/项目/sunan/sunan/docs/handbook/苏南船舶管理系统操作手册.docx)，生成器报告 14 个章节、48 张正文图；DOCX 压缩结构无错误，LibreOffice 实际用户字体环境渲染为 79 页 A4，封面、目录、证照章节、末页抽查无中文缺字、溢出或截图变形。
- 发现并修正工作平台自动补值仍写入 date-only 的边界：培训完成时间、会议资料留存截止时间和培训完成按钮现在均保存完整 ISO 时间。
- 交付提示：图 5-4A/B/C、图 5-5A/B、图 7-1B 仍需按新版分组统计、日期时间控件和提醒分类页面重拍；图 8-1B/C 已使用新版日期时间与船舶下拉截图，其余已有真实截图已保留。
- 本轮环境限制：手册生成首次因默认 Node 找不到 `docx` 模块，改用工作区 bundled `NODE_PATH` 后成功；系统没有 `pandoc`，改用 OOXML 文本流核对；文档隔离渲染 profile 缺少中文字体，实际 `HOME=/Users/yuan` 渲染已确认中文正常。

## 会话：2026-08-19（移除不存在的安全管理操作）

### 阶段 21：移除实际系统不存在的安全管理操作
- **状态：** completed
- 用户再次确认实际系统没有安全管理操作；本轮以用户实际系统口径覆盖源码中存在但不可见的安全路由判断。
- 已完成全手册残留扫描，确认安全内容分散在文档说明、权限、路由、通用操作、工作平台、独立安全章节、移动现场操作、角色清单、管理员检查、FAQ、合规、截图统计和维护依据中。
- 已删除旧第 9、10 章及所有安全管理/检查整改残留；保留的工作平台章节只描述真实存在的培训、会议、考勤、审批、航次、燃油、海图和通用附件能力。
- 已将旧第 11-16 章连续改为新第 9-14 章，删除安全角色、任务/CAPA 管理员检查、相关 FAQ、合规条款和维护规格链接。
- 已同步更新 Markdown、DOCX 生成器、Word、docs/README.md 和 docs/inventory.md，不保留“隐藏入口”或“功能存在但未显示”的表述。
- 验证结果：14 章、40 张真实图、7 个正式占位、1 个示例占位；DOCX 105 页；目录页码为 3/6/8/19/32/48/56/82/94/96/98/102/103/104；DOCX validator、PDF/XML 禁用词扫描、索引检查和 diff 检查通过。
- 页面抽查：目录页清晰列出 14 章；第 82 页工作平台章节标题、表格和页脚无溢出或空白错位。

## 会话：2026-08-30（补充工作平台截图）

### 阶段 22：补充工作平台截图并更新手册图位
- **状态：** completed
- 用户在 `docs/handbook/image/` 新增图 8-1B 至图 8-1G 六张真实截图；已核对文件名、尺寸和视觉内容，均与正文对应图题匹配。
- 已将六张截图替换到 Markdown 对应占位，保留原始比例；长图交由 DOCX 生成器连续切片分页。
- 已将第 13 章统计更新为 47 个正式图位、46 张真实截图、1 个剩余正式占位（图 5-5B 证书提醒详情）以及 1 个第 1 章示例占位。
- 已按比例驱动规则重新生成并渲染 DOCX：实际 HOME 下 LibreOffice 输出中文可读的 A4 文档共 93 页；连续竖图（如图 8-1B/8-1C）并排，超长图（如图 8-1G）仅分为上下两段，未拉伸或重复裁切。
- 已回填新的静态目录页码（3、6、8、16、25、42、50、72、82、84、86、90、91、92），并复核封面、目录、工作平台图片页和末页。
- 已通过文档索引、图片路径、DOCX validator、禁用术语扫描和 `git diff --check`；清理字体测试临时文件。

## 会话：2026-08-19（最新版真实功能手册与截图替换）

### 阶段 20：最新版真实功能手册与截图替换
- **状态：** completed
- 用户要求再次按最新版系统更新操作手册，优先完善 DOCX；用户已将一批实际截图放入 `docs/handbook/image/`，缺失处继续使用 4:3 占位图，并删除系统不存在的功能和步骤。
- 已读取文档生成、规划和交付前验证技能，并完成截图清单、当前实现差异清单和原子化手册修改。
- 已将手册版本和核对日期更新为 `0.0.7` / `2026 年 8 月 19 日`，修正真实截图与 4:3 占位图的展示规则。
- 已按图号将 40 张真实截图嵌入第 3 至第 8 章；第 9 章安全管理和第 8 章未取得截图的位置继续使用 34 个正式 4:3 占位图，另保留第 1 章示例占位图。
- 已核对企业资料/制度/证照/提醒/监控、办事治理、采购审批和附件解除、工作平台模块、计划任务、检查模板/计划/现场检查、问题与 CAPA 页面；未发现需要删除整章的当前模块，保留的动作均能在源码或 API 中找到对应实现。
- 已修改 `scripts/generate-handbook-docx.mjs`：占位图继续渲染为 4:3，真实截图按原比例缩放；过长截图按连续切片分页，避免 Word 拉伸或溢出。
- 按源码继续收紧边界：删除工作平台考勤“导出/对账”、记录详情“异步导出任务”，将采购附件解除明确为唯一当前 H5 解除动作，并删除工作平台/安全证据替换、解除、归档的操作暗示；CAPA 关闭图注改为实际的按钮/失败提示。
- 重新生成 DOCX 并把静态目录页码更新为最新 PDF 的实际章节起始页：`3, 7, 9, 20, 31, 50, 58, 84, 98, 131, 133, 136, 138, 143, 144, 145`。
- 最终验证：DOCX validator `All validations PASSED`（1,842 个段落）；LibreOffice 渲染为 146 页 A4；Markdown 75 个图片引用（40 张真实截图、34 个正式 4:3 占位、1 个示例占位）与 75 个图注全部存在；手册正文无 M9、Wave、旧版本、旧日期或异步导出措辞；`git diff --check` 通过。
- 交付前新鲜复验再次运行生成器、DOCX validator、LibreOffice、`check-doc-index`（278 个 Markdown）和路径/术语扫描；章节起始页仍为 3/7/9/20/31/50/58/84/98/131/133/136/138/143/144/145。

## 会话：2026-08-16（新一轮优化版本生产发布）

### 阶段 19：发布调查与执行
- **状态：** completed
- **开始时间：** 2026-08-16
- 执行的操作：
  - 重新读取 `planning-with-files-zh` 技能，恢复上次 0.0.6 生产发布的版本、备份、切换、验证和回滚证据。
  - 新增阶段 19，固定“改动审计→唯一版本→全量门禁→新备份→服务器构建→分阶段切换→独立复验”的发布顺序。
  - 检查 Git/版本/migration：HEAD 与 `origin/main` 同步为 `82174a2`，新增一个应用修复提交和一个手册提交，无新 migration，版本真源仍为 0.0.6。
  - 为保持镜像不可变追踪和可回滚性，确定本次补丁发布目标为 `0.0.7`，不覆盖现网 `0.0.6` 镜像。
  - 审计 `d4fa1a8..HEAD`：本轮应用增量是采购 PDF 字体裁剪、详情/返回导航、上传、采购报表、提醒和政策页面修复；无部署拓扑或 schema 变化。
  - 完成生产只读预检：现网 0.0.6、Compose 有效、六个长期服务正常、23 条 migration、公网 live/ready/Web/采购直达路由通过，近 30 分钟 API/Nginx 错误计数为 0。
  - 通过 `apply_patch` 将 11 个版本与部署真源统一更新为 0.0.7；前端源码无版本展示引用。
  - 完整发布前门禁通过：Web 60 files / 263 tests，API unit 22 suites / 116 tests，API integration 18 suites / 81 tests，合计 460 项、0 失败；API/Web build、API lint、21/21 OpenAPI、278 份 Markdown 索引与 diff 检查通过。
  - 针对 Jest 并行 worker 退出提示补跑全量 API unit `--detectOpenHandles --runInBand`，22 suites / 116 tests 通过且未报告句柄；本机 Node 24 偏差保留记录，生产 Dockerfile 固定 Node 20。
  - 服务器根盘约余 1.4 GB，但有 26.72 GB 未被活动容器使用的 Docker build cache；备份后、构建前只清理该缓存，不触碰生产镜像和数据。
  - 完成生产备份批次 `20260816214224`：PostgreSQL 565 entries、配置归档、Redis 时间点 RDB 及 SHA-256 清单均验证通过。
  - 回收 27.59 GB 未使用 Docker build cache；确认 Docker 数据盘余 68 GB，生产镜像、容器、卷和持久化数据保持不变。
  - 源码批次 `20260816214919` 流式上传并完成版本、23 条 migration、敏感 `.env` 排除和 6 个关键 SHA-256 校验后原子切换；旧源码保留为 `/dev/sunan/sunan-source/backup-20260816214919`。
  - 配置批次 `20260816215037` 备份并原子更新生产 `.env` 与 Compose 到 0.0.7，Compose 校验/哈希通过，运行容器当时仍为 0.0.6。
  - 服务器使用 Node 20 Dockerfile 构建 API/Web/Nginx 0.0.7 镜像；三个 OCI label 和 API package version 均为 0.0.7，镜像内采购 PDF 字体裁剪成功。
  - API 分阶段切换通过：0.0.7 healthy、23 migrations、DB/Redis/OSS ready，近 5 分钟错误为 0。
  - Web 首次切换因验证脚本使用 BusyBox 不支持的 `find -printf` 自动回切 0.0.6；改用已在旧容器验证的 shell glob 后再次切换，5 个关键资源和 8 条直达路由通过。
  - Nginx 切换到 0.0.7，`nginx -t`、公网 Web/API、无凭证 401 鉴权边界及近期错误检查通过。
  - 按 `verification-before-completion` 重跑独立证据链；前两轮验证脚本分别因 SSH stdin 被 Compose 消费和工作目录错误未采信，修正后完整复验退出 0：三个应用容器 0.0.7、API healthy、23 migrations、运行字体裁剪、备份清单/RDB、9 条路由、5 个资源、401、错误日志 0、证书、timers 和残留检查全部通过。

## 会话：2026-08-10（0.0.6 生产发布）

### 阶段 18：部署调查与发布
- **状态：** completed
- **开始时间：** 2026-08-10
- 执行的操作：
  - 完整读取 `planning-with-files-zh` 技能，恢复现有规划文件和历史发布线索。
  - 新增阶段 18，固定 `0.0.6` 版本、不新增前端显示、系统管理员增补与生产发布范围。
  - 检查 Git 状态、部署文件、版本号引用和系统管理员实现。
  - 确认当前完整应用提交为 `6645b51`、本地 `main` 比 `origin/main` ahead 1；管理员真源为生产 `WECOM_SYSTEM_ADMIN_USER_IDS` 白名单。
  - 通读部署索引、开发运维规范、标准发布手册、服务器清单、环境变量、备份恢复、排障和企业微信切换 runbook。
  - 对比 `b245d9e..HEAD`，确认本次业务代码无新数据库 migration，发布主体是 API/Web/Nginx 新镜像与 API 管理员环境变量更新。
  - 完成生产只读预检：现网 `0.0.5`、全部服务健康、23 条 migration 完整、目标管理员不存在，最近可用备份为 2026-08-04。
  - 确认 Let's Encrypt 证书已自动续期至 2026-10-16，`certbot.timer` active/enabled。
  - 通过 `apply_patch` 将 11 个版本和部署文件统一升级为 `0.0.6`，并将运维清单日期更新为 2026-08-10。
  - 版本残留、前端页面展示和 `git diff --check` 首轮检查通过。
  - 首轮全量测试：Web 60 files / 260 tests 全部通过；API unit 22 suites 中 21 通过，`certificate-reminder-job.service.spec.ts` 的锁续期失败重入队用例超过 5 秒，总计 115/116 通过。因 unit 失败，integration 尚未开始，生产无变更。
  - 按 `systematic-debugging` 技能读取完整错误、测试、service、Jest 配置和历史变更；确认失败文件不在本次发布代码 diff 中。
  - 单文件 `--runInBand --detectOpenHandles` 9/9 通过；失败用例单独连续 3 次通过，用时 0.85-0.93 秒。初步归因为首轮 Jest 并行资源争用造成的一次性超时，待全量 unit 复验。
  - 全量 API unit 新鲜复验通过：22 suites / 116 tests，无需修改业务或测试代码。
  - API integration 首轮独立运行在 18 个套件中统一报本机无容器运行时，81 项未进入业务断言；准备启动 Docker Desktop 后重跑。
  - 启动 Docker Desktop 并确认 daemon 29.6.1；integration 重跑为 15/18 suites、72/81 tests 通过。两个套件因刚启动后并发 PostgreSQL 容器端口绑定超时失败，证照套件有 1 个 401，准备对三个失败套件串行隔离复验。
  - 三个失败套件串行 `--detectOpenHandles` 复验通过：3 suites / 11 tests。
  - 全量 integration 再跑为 17/18 suites、80/81 tests 通过，仅 `ship-monitor` 在 120 秒超时，且 Jest 子进程未正常退出。终止本轮遗留测试进程后，单套件带 `--detectOpenHandles` 在 6.06 秒通过，业务用例耗时 86 ms。
  - 清理本轮失败遗留进程后，标准 API integration 全量复验完整通过：18 suites / 81 tests，用时 72.627 秒。
  - 完成 Web/API 生产构建、API lint、21/21 OpenAPI、278 份 Markdown 索引、版本一致性和 `git diff --check`；全部通过。
  - 备份远程脚本首次在本地 JS 模板字符串解析失败，未与生产建立连接；转义 shell 参数展开后成功执行。
  - 生产备份批次 `20260810022219` 已验证：DB dump 273,797 bytes / 565 entries，配置归档 12,871 bytes，Redis RDB 1,878 bytes，SHA-256 全部通过。
  - 源码首次流式上传因远端 heredoc 和 tar 管道共用 stdin 失败，原子切换未执行；核对现网仍为 0.0.5 并健康后，移除 0 文件的失败上传目录。
  - 修正为单一 stdin 解包后，源码批次 `20260810022504` 已完成版本/哈希/敏感文件校验和原子切换；回滚源为 `/dev/sunan/sunan-source/backup-20260810022504`。
  - 生产配置批次 `20260810022733` 已保留 `.env`/Compose 回滚文件，将版本更新为 0.0.6，管理员白名单由 3 增为 4 并确认 `DaFaShiDuDaXue` 存在，Compose 校验通过。
  - 服务器以 Node 20 Dockerfile 完成 API/Web/Nginx 0.0.6 镜像构建，三个 OCI 版本标签验证通过，构建日志为 `sunan-build-0.0.6-20260810022801.log`。
  - 分阶段切换 API 至 0.0.6：healthy、OCI/进程版本、23 条 migration、公网 live/ready 和近 5 分钟错误检查均通过，自动回切未触发。
  - 确认 API 容器内管理员白名单为 4 个、目标存在，且 `wecom_users` 已存在 1 条 `DaFaShiDuDaXue` 记录；角色真源已生效。
  - 分阶段切换 Web 和 Nginx 至 0.0.6；8 条直达路由、5 个版本化资源、Nginx 配置、鉴权 401 边界和近期错误计数全部通过。
  - 按 `verification-before-completion` 执行独立新鲜复验：本地版本/前端显示/文档/diff，生产容器/标签/源码哈希/备份/迁移/管理员/日志/证书/timer，以及本机外部公网 smoke 均通过。
  - 生产发布结果：API/Web/Nginx 均为 `0.0.6`，API healthy，PostgreSQL 23 migrations，DB/Redis/OSS ready，自动回滚未触发。
  - 回滚点：源码 `backup-20260810022504`，`.env`/Compose `bak-20260810022733`，DB/配置/Redis 备份批次 `20260810022219`。

## 会话：2026-08-09（企业微信头像、多部门与权限收口）

### 阶段 17：测试修复与最终验收
- **状态：** completed
- **开始时间：** 2026-08-09
- 执行的操作：
  - 恢复仓库持久化计划，核对实际 diff 与未跟踪测试文件。
  - 运行 `RequireAuth.auth.test.tsx` 和 `AppRoutes.test.tsx`，稳定复现 34 个失败。
  - 确认根因为测试 mock 缺失 `persistToken` 以及路由测试会话缺失 OAuth 授权版本标记，生产迁移逻辑无需回退。
  - 将 `RequireAuth` 测试改为部分 mock，并在 `AppRoutes` 测试中初始化当前授权版本。
  - 重跑两个定向测试文件：2 files / 39 tests 全部通过。
  - 根据官方文档复核 `snsapi_privateinfo -> user_ticket -> /cgi-bin/auth/getuserdetail -> avatar` 链路；确认部署配置未设置会阻断企业微信头像域名的 CSP。
  - 自审发现已签认检查参与人仍可能收到保存/提交动作；新增纯领域动作解析并按个人提交状态转为只读。
  - 定向回归通过：API 5 suites / 26 tests，Web 8 files / 68 tests。
  - 全量 Web 60 files / 257 tests 与 API unit 21 suites / 114 tests 通过；API integration 首次因 Docker Desktop 未启动而在容器创建前失败。
  - 启动 Docker Desktop 并确认服务端 `29.6.1`，重跑 API integration，18 suites / 80 tests 全部通过。
  - API/Web 生产构建和 API lint 通过；`git diff --check` 通过。
  - 文档索引首次校验发现头像/权限设计稿使用未允许的 `current-design` 并漏入 inventory；改用 `current-spec` 并准备重新生成索引。
  - 重建并校验文档索引：278 份 Markdown 全部通过；3 份变更 OpenAPI 均通过 `swagger-cli validate`。
  - 顶层全量测试首跑仅证照集成套件的 3 个 HTTP 用例超时；单套件带 `--detectOpenHandles` 重跑为 3/3 通过、无句柄报告，后续 API integration 全量 18 suites / 80 tests 通过，确认为一次性 Docker/Testcontainers 请求卡顿。
  - 首轮最终顶层 `CI=1 pnpm test` 完整退出 0：Web 60 files / 257 tests，API unit 21 suites / 114 tests，API integration 18 suites / 80 tests，合计 451 tests。
  - 独立代码审查发现管理员撤权仍可能读取旧数据库标记、监控写权限过宽、CAPA 生命周期接口可绕过、制度发布可跨部门废弃记录、头像失败被永久标记等 5 项重要问题；均先补红灯回归再实施最小修复。
  - 管理员权限和采购通知收件人统一以 `WECOM_SYSTEM_ADMIN_USER_IDS` 为真源；监控配置仅系统管理员可写；CAPA 非 `in_progress` 写操作返回 409；制度旧版本只在同部门废弃；敏感资料失败采用 24 小时冷却后自动重试。
  - 修复后新鲜顶层 `CI=1 pnpm test` 完整退出 0：Web 60 files / 260 tests，API unit 22 suites / 116 tests，API integration 18 suites / 81 tests，合计 457 tests。
  - 再次执行 API/Web build、API lint、4 份相关 OpenAPI、278 份 Markdown 索引和 `git diff --check`，全部退出 0；仅保留仓库要求 Node 20.x 而当前为 Node 24.18.0 的环境警告。
  - 同步 Markdown 与 Word 操作手册中的监控权限口径；DOCX 为 16 章、75 张嵌入图，压缩包、OOXML 和关键文本校验通过。
  - 完成全量 diff 自审，确认未生成新的非预期源文件，并按用户要求保留所有改动为未提交状态。

## 会话：2026-08-05（升级版操作手册与 Word 交付）

### 阶段 16：升级版操作手册与 Word 交付
- **状态：** completed
- **开始时间：** 2026-08-05
- 执行的操作：
  - 读取仓库规则和 `planning-with-files-zh`、`brainstorming`、`docx`、`verification-before-completion` 技能。
  - 恢复既有规划文件，确认当前工作树干净、HEAD 为 `b245d9e`，且 7 月操作手册后存在新的产品升级提交。
  - 建立“升级差异核对—参考稿版式分析—Markdown 更新—DOCX 生成—双格式验证”的执行阶段。
  - 加载文档运行时，读取参考 DOCX 的段落、表格、内嵌图片、A4 页面尺寸与页边距；确认参考稿以表格承载大部分图文步骤。
  - 将参考稿转换为 11 页 A4 PDF 并渲染前 6 页；首次预览误用 `page-1.png`，确认工具实际输出两位页码后改用 `page-01.png`。
  - 视觉检查参考稿封面和图文操作页，确认其为简洁黑白公文式版式，图文页使用截图/步骤双栏；记录 4:3 横向截图需要调整为更宽的占位布局。
  - 审计 7 月手册基线后的提交和文件差异，确认当前版本为 `0.0.5`，但现手册仅同步版本/日期，尚未说明 8 月升级的文件预览、头像、多部门权限、报表和跨模块 UI 行为。
  - 用户确认采用方案 A，并补充多图要求；已固化全宽 4:3 单图、字母子图连续编号、Markdown 单一真源和 DOCX 可复现生成设计。
  - 设计文档通过占位词、结构、4:3/多图规则、文档 inventory（277 份）和 diff 格式自检，等待用户书面审阅。
  - 用户确认书面设计；开始按实际源码核对文件策略、上传/预览组件、用户头像、多部门展示及采购报表审批详情。
  - 对照现手册确认三类升级缺口：文件格式/预览规则仍为旧口径，报表审批详情未覆盖业务化展示和 PDF 预览，多部门与头像行为尚未说明。
  - 首次尝试跨多个章节原子更新手册，因打印/PDF 小节锚点不匹配被完整拒绝；确认无部分修改后改用分章节补丁。
  - 已完成文档日期、4:3/多图规则、用户身份、多部门、头像、企业微信入口、移动导航、上传格式、系统内预览、失败重试和通用 PDF 操作的第一批正文更新。
  - 补齐“我的、办事、采购、工作平台、安全管理”的全宽截图图组，并把旧 64 项文字清单改为 74 个正文正式占位的分章统计和补图验收规则。
  - 修正采购附件预览、采购单/报表 PDF 双动作、报表业务摘要/指标/审批进度，以及文件预览与 PDF 排障说明。
  - 新增 1200×900 通用 SVG 图位和可复现的 DOCX 生成脚本；生成的 Word 嵌入 75 张 4:3 PNG，并采用 A4、封面、目录、页眉页码和参考稿近似页边距。
  - DOCX 首轮校验因系统 Python 版本与 bundled Python 依赖分散失败；隔离复用系统已有的纯 Python `defusedxml` 后，1,791 个段落的 OOXML 结构校验全部通过。
  - 发现动态目录在 LibreOffice 预览中为空；改为 16 章静态可见目录。尝试加入内部跳转时 docx-js 生成重复书签数字 ID，移除非必要书签后恢复为全部结构校验通过，并按最终渲染结果校正章节页码。
  - 更新 `docs/README.md`，为 0.0.5 手册同时提供 Markdown 与 Word 入口；重新生成并通过 277 份 Markdown 文档索引门禁。
  - 执行最终新鲜复验：16 个一级章、75 个实际 4:3 图位（其中 74 个正式待补图）、75 个唯一图注、75 个 4:3 Word 绘图对象、132 页 A4 渲染均符合预期；本地图片、文档链接、压缩包、OOXML 与 `git diff --check` 全部通过。
  - Markdown 和渲染文本均未检出 M9、Wave、波次、里程碑、backlog、execplan、参考产品名称、旧版本号、旧日期或未决占位词；关键升级术语和 0.0.5 日期口径均存在。
- 创建/修改的交付文件：
  - `docs/handbook/苏南船舶管理系统操作手册.md`
  - `docs/handbook/苏南船舶管理系统操作手册.docx`
  - `docs/handbook/assets/screenshot-placeholder-4x3.svg`
  - `scripts/generate-handbook-docx.mjs`
  - `docs/README.md`
  - `docs/inventory.md`

## 会话：2026-07-14（苏南操作手册全面更新）

### 阶段 15：全面更新苏南船舶管理系统操作手册
- **状态：** completed
- **开始时间：** 2026-07-14
- 执行的操作：
  - 读取仓库 `AGENTS.md`、规划技能、文档共创技能和创意校准技能。
  - 恢复既有 `task_plan.md`、`findings.md`、`progress.md`，确认上一轮生产发布已完成。
  - 检查 Git 工作树、最近提交、`docs/handbook` 文件清单和前端路由入口。
  - 确认本轮只更新文档，不改变产品代码、权限或生产状态。
  - 通读主手册现有章节与 4 份 handbook 的目录/状态，识别安全专用页面、采购预算和报表申请等覆盖缺口。
  - 读取需求目录、各领域规格索引、体验指引、前端路由配置和 My/Office/Procurement/Workbench 页面上的用户可见字段与动作。
  - 通读安全 UI/状态规格、工作平台模块/权限矩阵与任务、计划、主数据、检查和 CAPA 的实际 React 页面，实现规格与现有按钮分层记录。
  - 逐页核对企业资料、制度、电子证照、提醒、设置、监控和办事治理表单，并读取文件上传、认证与企业微信 JS-SDK 规格。
  - 将主手册从 859 行重构扩展至 1929 行，完整写入 16 章操作说明和 64 项正式截图清单。
  - 执行占位词、边界词、重复标题、关键路由和关键动作覆盖扫描，当前无重复标题或缺失关键入口。
  - 进行读者问题测试和第二轮源码对照，修正采购退回/驳回、PDF 归档口径及安全专用页面入口说明。
  - 更新 `docs/README.md` 的手册版本导航，重新生成 269 份 Markdown 的 `docs/inventory.md` 并通过索引检查。
  - 最终校验首次因 README 链接显示文字断言过窄而提前退出；逐项诊断确认正文、日期、章节、README 实际链接和 inventory 链接均正确，问题仅在校验表达式。
  - 改用稳定链接目标的固定字符串断言后执行新鲜全量复验：文档索引 269/269、`git diff --check`、front matter、16 章结构、64 项截图连续编号、10 个本地链接、关键模块/边界词和未决占位词扫描全部通过，命令退出码为 0。
- 创建/修改的文件：
  - `task_plan.md`
  - `findings.md`
  - `progress.md`
  - `docs/README.md`
  - `docs/handbook/苏南船舶管理系统操作手册.md`

## 会话：2026-07-04

### 阶段 1：需求与现状发现
- **状态：** complete
- **开始时间：** 2026-07-04
- 执行的操作：
  - 读取 planning-with-files-zh 技能说明与模板。
  - 检查仓库根目录与 docs 文件清单。
  - 创建本次任务规划文件。
  - 读取 `docs/README.md`、`docs/inventory.md`、`docs/execplans.md`、`docs/plans/README.md`、`docs/prompts/README.md`。
  - 发现当前执行入口仍指向原 M7/M8，需要先改为上线修复优先；用户确认后进一步重排为新 M7。
  - 读取 M1-M8 需求、通用上传/体验规则、my/office/procurement/workbench 相关规格、M7/M8 计划与 prompt 样例。
- 创建/修改的文件：
  - `task_plan.md`
  - `findings.md`
  - `progress.md`

### 阶段 2：规划结构设计
- **状态：** complete
- 执行的操作：
  - 将 9 个问题映射为新 M7 六个修复 Wave。
  - 决定用正文说明原 M7/M8 顺延，不新增文档状态枚举。
- 创建/修改的文件：
  - `task_plan.md`
  - `findings.md`

### 阶段 3：文档实现
- **状态：** complete
- 执行的操作：
  - 新增新 M7 修复执行计划和 backlog。
  - 新增新 M7 六份 wave prompt。
  - 更新执行计划、计划索引、提示词索引和 README。
  - 在原 M7/M8 路线图、执行计划和 backlog 加顺延说明。
- 创建/修改的文件：
  - `docs/plans/M7-execplans.md`
  - `docs/plans/M7-wave-backlog.md`
  - `docs/prompts/m7/wave-1-upload-and-my-polish.md`
  - `docs/prompts/m7/wave-2-office-css-search.md`
  - `docs/prompts/m7/wave-3-procurement-navigation-pdf.md`
  - `docs/prompts/m7/wave-4-workbench-navigation-density.md`
  - `docs/prompts/m7/wave-5-wecom-direct-regression.md`
  - `docs/prompts/m7/wave-6-final-acceptance-gate.md`
  - `docs/execplans.md`
  - `docs/plans/README.md`
  - `docs/prompts/README.md`
  - `docs/README.md`
  - `docs/plans/M8-M9-upgrade-roadmap.md`
  - `docs/plans/M7-execplans.md`
  - `docs/plans/M7-wave-backlog.md`
  - `docs/plans/M8-execplans.md`
  - `docs/plans/M8-wave-backlog.md`

### 阶段 4：格式与一致性验证
- **状态：** complete
- 执行的操作：
  - 使用 Codex bundled Node 运行 `node scripts/generate-doc-inventory.mjs`。
  - 运行 `node scripts/check-doc-index.mjs`。
  - 运行 `git diff --check`。
  - 检查 git status 和新增文档索引命中情况。
- 创建/修改的文件：
  - `docs/inventory.md`

### 阶段 5：交付
- **状态：** complete
- 执行的操作：
  - 准备最终说明，明确只完成文档规划，未执行业务代码修复。
- 创建/修改的文件：
  - 无新增

### 阶段 6：里程碑重排
- **状态：** complete
- 执行的操作：
  - 按用户最新意图，将 M1-M6 修复正式作为新 M7。
  - 新增 `docs/requirements/M7-上线体验与导航修复.md`。
  - 将原 M7 安全管理底座文件后移为 M8。
  - 将原 M8 专业安全深化文件后移为 M9。
  - 将修复提示词移动到 `docs/prompts/m7/`，将原 M7/M8 提示词移动到 `docs/prompts/m8/` 与 `docs/prompts/m9/`。
  - 更新 `docs/execplans.md`、`docs/plans/README.md`、`docs/prompts/README.md`、`docs/README.md` 和相关规格入口。
- 创建/修改的文件：
  - `docs/requirements/M7-上线体验与导航修复.md`
  - `docs/requirements/M8-安全管理底座与核心闭环.md`
  - `docs/requirements/M9-专业安全业务深化与体系完善.md`
  - `docs/plans/M7-execplans.md`
  - `docs/plans/M7-wave-backlog.md`
  - `docs/plans/M8-M9-upgrade-roadmap.md`
  - `docs/plans/M8-execplans.md`
  - `docs/plans/M8-wave-backlog.md`
  - `docs/plans/M9-execplans.md`
  - `docs/plans/M9-wave-backlog.md`
  - `docs/prompts/m7/`
  - `docs/prompts/m8/`
  - `docs/prompts/m9/`

## 测试结果
| 测试 | 输入 | 预期结果 | 实际结果 | 状态 |
|------|------|---------|---------|------|
| 文档清单生成 | `node scripts/generate-doc-inventory.mjs` | inventory 包含新增文档 | generated docs/inventory.md for 221 markdown files | pass |
| 文档索引检查 | `node scripts/check-doc-index.mjs` | 无缺失 front matter、非法状态或断链 | doc index ok: 221 markdown files | pass |
| Diff 格式检查 | `git diff --check` | 无行尾空白和冲突标记 | 无输出，退出码 0 | pass |

## 错误日志
| 时间戳 | 错误 | 尝试次数 | 解决方案 |
|--------|------|---------|---------|
| 2026-07-04 | 默认 PATH 中找不到 `node` | 1 | 使用 Codex bundled Node 绝对路径执行文档脚本 |

## 会话：2026-07-10

### 阶段 7：M7 实现审计与 M8/M9 缺口登记
- **状态：** completed
- 执行的操作：
  - 读取现有规划文件和 M7/M8/M9 执行计划、提示词索引。
  - 确认当前文档将 M7 标为“Wave 1-6 已完成本地最终门禁”，并将 M8/M9 标为后续升级路线。
  - 记录用户报告的采购执行清单附件删除缺口，尚未修改领域规格或业务代码。
  - 初步定位该缺口与 M8 Wave 3 的通用附件组件直接相关；既有 M7 Wave 3 验收仅覆盖绑定、预览、下载和权限，未要求删除。
  - 已读完 M7 需求、执行计划、backlog、六份 Wave 提示词与 Wave 1-6 验收材料；确认 M7 最终证据是有条件通过，剩余企业微信真机证据为 P2。
  - 已核对采购附件代码与规格：当前只有绑定和受权下载，缺少解除关联 API 与删除 UI；M8 七个 Wave 提示词均存在，新增缺口应细化至 Wave 3。
  - 已读完 M9 执行计划、backlog 与八份 Wave 提示词；确认 M9 的前置是 M8 总体验收，因此不应承接 M8 通用附件缺口。
  - 尝试执行当前 M7 验证矩阵，但默认 PATH 找不到 Node；已定位到 Codex bundled Node/Pnpm，准备改用绝对路径重跑。
  - 使用 bundled Node/Pnpm 重跑时，PnPM 需要清理/重装 `node_modules` 但非交互环境拒绝；为保护依赖未强制安装。文档索引检查在 bundled Node 下通过（227 个 Markdown）。
  - 用户确认 M7 真机验证完成并授权归档；已更新 M7 Wave 6 最终验收结论并将计划、backlog、提示词迁入 archive。
  - 已将采购执行清单附件删除缺口登记为 M8 Wave 3 的受审计解除关联修复，并在 M9 Wave 1 增加基线回归门禁。
- 下一步：
  - 重新生成 inventory，运行文档索引、路径和格式校验。
  - 已重新生成 `docs/inventory.md`，并确认 `check-doc-index`、`git diff --check`、M7 归档路径、M8/M9 提示词数量和当前入口引用均通过。
- 下一步：
  - 审计 M7 各 Wave 的计划、验收、代码和测试证据。
  - 阅读 M8/M9 全部计划与提示词，提出附件删除缺口的归属方案并向用户确认。

### 阶段 8：M8 Wave 1 安全管理底座文档冻结
- **状态：** complete
- **开始时间：** 2026-07-10
- 执行的操作：
  - 检查 git 工作树；开始完整阅读用户指定的 M8 入口、通用规范和既有规划文件。
  - 恢复并更新既有任务规划、发现和进度记录，不覆盖任何非本任务变更。
  - 已通读 M8 需求、M8/M9 路线、M8 执行计划/backlog、通用 API/DB 规范、工作平台和安全规格入口，并记录 Wave 1 P0 冻结范围。
  - 已创建安全领域边界、唯一术语/状态、测试矩阵、迁移原则和 API/DB/state/UI 目录索引；已将计划、文档和提示词入口指向这些基线。
  - 已建立 Wave 1 验收证据，并执行文档清单生成、文档索引与差异格式检查；最终结果以本会话结束前的复验输出为准。
- 创建/修改的文件：
  - `task_plan.md`
  - `findings.md`
  - `progress.md`

### 阶段 9：M8 Wave 2 权限与流程状态链
- **状态：** in_progress
- **开始时间：** 2026-07-10
- 执行的操作：
  - 已核验 `docs/archive/acceptance/safety/acceptance-m8-wave1.md`：Wave 1 状态为通过、无 P0/P1 blocker。
  - 开始读取 Wave 2 需求、既有 RBAC/工作平台权限和状态规格，后续先完成具体规格与红灯测试。
  - 已新增两项 PostgreSQL 集成测试作为预期红灯；运行被 Node 20.x 与 bundled Node v24 的依赖不匹配拦截，未重装或删除现有 `node_modules`。
  - 已建立 Wave 2 API/DB/state/UI 规格，新增参与人、代理、转移实体与 migration，并在工作平台服务接入记录级 ABAC、动作授权和非法关闭转换拦截。
  - `tsc --noEmit -p apps/api/tsconfig.json` 已通过；集成测试随后因没有可用 Docker/testcontainers runtime 在测试启动前终止，未产生业务断言结果。
- 创建/修改的文件：
  - `task_plan.md`
  - `progress.md`

## 五问重启检查
| 问题 | 答案 |
|------|------|
| 我在哪里？ | 阶段 6：里程碑重排完成，待最终校验 |
| 我要去哪里？ | 重新生成 inventory，运行文档索引和格式校验 |
| 目标是什么？ | 完成新 M7 修复与 M8/M9 后移文档规划 |
| 我学到了什么？ | 见 findings.md |
| 我做了什么？ | 见上方记录 |

---
*每个阶段完成后或遇到错误时更新此文件*

## 会话：2026-07-12（新版本发布）

### 阶段 14：新版本构建、版本号更新与生产发布
- **状态：** in_progress
- **开始时间：** 2026-07-12
- 执行的操作：
  - 读取 `planning-with-files-zh` 技能并恢复根目录规划文件。
  - 检查当前 Git 分支和工作树，识别并隔离用户已有的 `.superpowers` 删除项。
  - 建立发布发现、版本更新、构建、迁移、上线、验收和回滚保护的执行清单。
  - 读取部署架构、快速开始、生产部署手册、两份 Compose、部署环境示例及企业微信生产切换 runbook。
  - 确认本次采用源码同步后服务器构建，目标版本应为 `0.0.4`，且生产重建前需补做数据库备份。
  - 核对根/API/Web package metadata、Compose OCI 标签和 `SUNAN_VERSION`，确定 6 个最小版本文件；确认无需更改前端 UI 或锁文件。
  - 读取 Dockerfile、Makefile、部署索引、运维边界与备份恢复手册，冻结“先备份、再同步/构建、后验收”的顺序。
  - 参照上一轮发布提交的精确变更边界，将根/API/Web package metadata、API 环境默认值与测试、部署模板、两份 Compose OCI 标签以及环境/服务器文档统一更新为 `0.0.4`；未改前端 UI。
- 创建/修改的版本文件：
  - `package.json`
  - `apps/api/package.json`
  - `apps/web/package.json`
  - `apps/api/.env.example`
  - `apps/api/src/config/env.ts`
  - `apps/api/src/config/env.spec.ts`
  - `deploy/.env.example`
  - `deploy/docker-compose.yml`
  - `deploy/docker-compose.prod.yml`
  - `deploy/environment-variables.md`
  - `deploy/server-inventory.md`
  - 执行 `git diff --check` 和版本残留扫描，结果通过；确认 11 个文件的 `0.0.4` 联动完整。
  - 尝试在本地运行两份 Compose `config --quiet`；因文件硬编码引用生产 `/dev/sunan/deploy/.env` 而在读取阶段失败，已改为计划在远端真实环境复验。
  - 运行完整 `pnpm test`：Web 61/61 files、238/238 tests；API unit 16/16 suites、79/79 tests；API integration 18/18 suites、78/78 tests；总计 395 项，失败 0。

## 本次发布测试结果
| 测试 | 结果 | 状态 |
|---|---|---|
| Web Vitest | 61 files / 238 tests | pass |
| API Jest unit | 16 suites / 79 tests | pass |
| API PostgreSQL integration | 18 suites / 78 tests | pass |
| Web production build | Vite + TypeScript | pass |
| API production build | Nest build | pass |
| API lint | ESLint src + test | pass |
| OpenAPI | 21/21 specs | pass |
| 文档 inventory/index | 269 Markdown | pass |
| Diff 格式 | `git diff --check` | pass |
  - 完成生产只读预检：版本 `0.0.3`、Compose 配置有效、服务和公网健康正常、关键配置均已设置、磁盘余量充足、系统 timers active。
  - 确认生产仅有 15 条 migration 且尚无安全存量迁移 CLI；下一步先创建并验证新鲜备份，再同步源码/构建但暂不切流。
  - 首次备份生成了有效 PostgreSQL dump 和配置归档；Redis 在线 AOF tar 因增量文件持续写入返回非零，发布流程已自动停止，未同步源码或构建镜像。
  - 按系统化调试完成根因调查：AOF 写入与 tar 读取竞争；确认 Redis 持久化健康且支持 `redis-cli --rdb`，准备改用可验证的时间点 RDB。
  - 使用 `redis-cli --rdb` 生成一致性 Redis 快照并由 `redis-check-rdb` 验证；重新核验 PostgreSQL/配置备份，生成 SHA-256 清单。发布前备份批次 `20260712223040` 全部通过。
  - 审计生产待执行的 7 条新 migration：上行路径以增量 schema 为主，不删除既有表/列；确认 classify 可在 schema 变更前只读运行，run/verify 必须在 schema 后执行。
  - 源码首次上传已成功但后置校验因本地提前展开远端变量而退出；现网 current 未变。已用分层诊断确认 tar 大小、远端 upload 目录和失败边界，准备复用 upload 做参数化校验/切换。
  - 复用已上传目录完成参数化校验和原子源码切换；旧源码备份路径为 `/dev/sunan/sunan-source/backup-20260712223349`。
  - 在不重建容器的前提下完成 API/Web/Nginx `0.0.4` 镜像构建和 OCI 标签核验；现网继续运行三个 `0.0.3` 应用镜像。
  - 用 `0.0.4` API 镜像在旧 schema 上执行只读安全存量 classify，结果为空数组并保存报告。
  - 首次恢复演练校验因错误表名/引号和退出码掩盖不可采信；按系统化调试重写后完整重做，临时库恢复、核心表计数和删除确认均通过。
  - 用一次性 `0.0.4` 容器执行生产 schema migration，migration 15 → 22；核对 7 条新增名称，旧 API 迁移后仍 live/ready。
  - 安全存量 run 已生成 0 行完成批次；修复 SSH stdin 被 Compose 消费的问题后补做独立 verify，JSON 和数据库对账全部通过。
  - 确认生产 Compose/Nginx 无运维漂移；备份实际 `.env`/Compose，将部署配置更新为 `0.0.4` 并通过远端 Compose 校验，服务仍未重建。
  - 分阶段切换 API：`sunan-api:0.0.4` healthy，版本环境/OCI/migration/live/ready 全部通过，未触发回切。
  - 分阶段切换 Web 和 Nginx：两者均为 `0.0.4`，Nginx 配置、容器内 Web、关键懒加载 chunk、公网 Web/API 检查通过，未触发回切。
  - 按 `verification-before-completion` 执行独立新鲜复验：版本、容器、数据库、备份、发布证据、直达路由、鉴权边界、静态资产、日志错误、timer 和客户端公网检查全部通过。
  - 现场企业微信 iOS/Android/桌面真机主链未由 Codex 执行，最终交付必须保留该人工验收项。

### 生产发布结果
- **版本：** `0.0.4`
- **源码切换：** `20260712223349`
- **数据库/配置/Redis 备份：** `20260712223040`
- **安全存量批次：** `074c54d9-8ac1-4169-81de-8012a9659c04`（0 来源、0 失败）
- **数据库 migration：** 15 → 22
- **运行镜像：** `sunan-api:0.0.4`、`sunan-web:0.0.4`、`sunan-nginx:0.0.4`
- **回滚源码：** `/dev/sunan/sunan-source/backup-20260712223349`
- **回滚配置：** `/dev/sunan/deploy/.env.bak-20260712223349`、`/dev/sunan/deploy/docker-compose.yml.bak-20260712223349`
- **发布结论：** 生产切换和自动化 smoke 通过；企业微信三端真机项待用户现场执行。

### 最终新鲜复验
- `node scripts/check-doc-index.mjs`：269 个 Markdown，通过。
- 全局版本一致性脚本：11 个版本/部署文件均为 `0.0.4`，通过。
- 前端源码版本展示扫描：`apps/web/src` 无 `SUNAN_VERSION` 或 `0.0.4` 引用，通过。
- 生产二次稳定性检查：三个应用镜像 `0.0.4`、API healthy、22 migrations、近 15 分钟 API/Nginx 错误标记 0。
- 服务器与本机外部网络：API ready 依赖全为 ok，任务/问题直达 Web 路由 200。
- 下一步：
  - 并行核对部署文档、版本号真源与本地/远端发布基础设施。

## 会话：2026-07-11

### 阶段 10：M8 Wave 5 计划任务中心、待办、日历与企业微信任务消息
- **状态：** completed
- **开始时间：** 2026-07-11
- 执行的操作：
  - 读取仓库 `AGENTS.md`、当前 Git 状态、既有根目录规划文件及 Wave 2/Wave 4 现状索引。
  - 确认 Wave 4 的完成提交为当前 HEAD，工作树开始时无未提交改动。
  - 将持久化计划的当前阶段切换至 Wave 5，等待完成用户指定资料阅读与设计冻结。
  - 已通读 M8 需求、执行计划、backlog、Wave 5 prompt、通知、消息推送、企业微信入口、前端体验和安全领域索引；确认本 Wave 的统一任务真源、幂等、深链和体验约束。
  - 已读取 API/DB/授权、Wave 2 流程权限与 Wave 4 主数据规格，并检索现有提醒、企业微信消息、路由和任务日历相关代码；将复用边界记录到 findings。
  - 启动持久化视觉辅助会话并展示三种仅布局的任务中心方案；用户选择 A（任务主导、列表/日历切换），未修改既有视觉语言。
  - 用户确认计划负责人直接启用、管理员可跨范围操作；已复核 OAuth 回跳、企业微信发送、提醒幂等模式、工作平台页面/API 和 TypeORM 注册机制，准备提出实现架构选择。
  - 用户确认独立 `PlanTaskModule` 架构、任务唯一真源、A 布局、任务状态/权限/消息边界；已创建 Wave 5 设计文档并执行占位词扫描、文档清单生成、文档索引和 diff 格式检查。
  - 用户已审阅并授权继续；开始 W5.1 规格冻结。`writing-plans` skill 不可用，改以本项目持久化文件计划展开 W5.1-W5.6 工作包；尚未创建生产表、实体、接口、测试或页面。
  - 已冻结 Wave 5 API、DB、state、UI 规格，并更新安全领域、通用通知和企业微信消息推送契约；日历固定使用 `GET /tasks` 同源真实任务查询。
  - 规格更新遇到三次原子补丁上下文校验失败，均未部分写入；根因是跨文件补丁假定了 API schema/日志行序。已切换为按稳定文件锚点逐文件更新，下一步验证 OpenAPI 与文档索引。
  - 已新增领域单元测试并完成红—绿循环：周期月末、闰年、稳定生成键、并发键与逾期/动作边界通过。
  - 已实现初始 PlanTaskModule、迁移、计划/计划项/生成/任务基础 API、任务中心路由与 A 布局；PostgreSQL 集成测试验证并发生成不重复、转移后旧责任人被拒绝。
  - 已在转移/催办时写入逐接收人投递记录，并调用企业微信文本卡片服务写回 sent/failed/retry 数据。集成 Jest 有开放句柄警告，尚未定位完成，不能作为全量门禁通过证据。
  - 使用 `--detectOpenHandles --runInBand` 复跑计划任务集成测试，稳定退出且未再报告句柄；随后逐项审计 OpenAPI、DB/state/UI 规格与实现，确认需重构垂直切片以补齐完整契约和验收。
  - 完成 10 张 Wave 5 数据表、每日调度、生成/对账运行、单一任务真源、转移/代理/改期/取消/催办/升级、企业微信 assignment 和失败重试去重。
  - 完成任务中心 A 布局、五类数据范围、真实日历、计划项管理、任务动作与消息投递详情，延续现有 Ant Design 系统视觉。
  - PostgreSQL 集成测试覆盖并发不重复、数据同源、改期/取消、转移后旧责任人 403、代理执行、消息失败/重试/去重和同日逾期升级。
  - 2026-07-12 最终复跑：完整 Web 60 files / 236 tests、API unit 15 suites / 70 tests、API integration 16 suites / 69 tests 通过；Wave 5 专项 11 tests 通过；API/Web build 和 API lint 通过，并清零 Router、Form、Redux、OSS 测试网络与严格类型告警。
  - 独立复核后将任务、参与人、生成 entry 和 assignment outbox 收入按 generation key 加锁的同连接事务；将任务动作、日志和投递 outbox 同事务提交；投递新增追加式 `attempt_history`。故障注入测试验证失败回滚、failed entry、可安全重放和错误历史保留。

## 会话：2026-07-12

### 阶段 11：M8 Wave 6 检查、问题与 CAPA
- **状态：** completed
- 执行的操作：
  - 完整阅读 Wave 6 指定的 M8 需求、执行计划/backlog、平台对比建议、Wave 2 权限、Wave 3 证据、Wave 5 任务、安全领域与工作平台检查整改规格。
  - 核验 Wave 5 完成提交、任务领域实体、前端路由和四类现有检查整改模块；确认应新增独立安全领域模块并仅通过链接集成工作平台来源。
  - 提出三种架构路径；用户确认采用独立检查/CAPA 对象、复用计划任务/证据/ABAC 的推荐设计。
  - 误将根目录历史规划文件当作新文件写入；发现后立即用 Git index 原文恢复，未更改业务代码或规格。
- 下一步：
  - Wave 6 书面设计已写入、自检并通过文档索引校验；提交后等待用户审阅该设计文档。获得书面设计确认后开始规格冻结与 TDD。
  - 用户审阅并确认书面设计；已冻结 inspection-capa API、DB、state、UI 规格，同步工作平台检查整改来源关联规格和安全领域索引。
  - OpenAPI 首次校验定位为 YAML 流式 response description 的逗号未引号；按 Wave 5 已验证写法修正后，inspection-capa 与 workbench API 均通过 Swagger，文档索引通过。
  - 已按 TDD 写入纯领域红灯测试与 PostgreSQL 集成测试；集成覆盖版本快照、多人 all 门槛、并发转单去重、失败转单补偿、CAPA 证据/返工/验证关闭及四类工作平台来源双向链接。
  - 已实现独立 InspectionCapaModule、18 张领域表迁移、计划任务复用、模板/检查/统一问题/CAPA API、工作平台来源回链和工作平台内懒加载页面。
  - 初次本地 migration 因 PostgreSQL 未启动被拒绝；启动仓库 compose 依赖后 `make migration-run` 成功。专项 API unit/integration、前端组件测试、API lint 与 API/Web build 已运行；进入最终全量复验与代码审阅。
  - 最终复验：API 单元测试 16 suites / 79 tests 通过；Wave 6 PostgreSQL 集成测试 4 tests 通过；完整 Web 测试与根 `pnpm test` 通过；根 `pnpm build` 通过。
  - 重新执行两个 OpenAPI Swagger 校验、`make migration-run`、文档 inventory/index 校验（258 个 Markdown）和 API lint；lint 发现并修复一个未使用导入后复验通过，`git diff --check` 通过。
- 交付证据链：
  - 集成测试 `inspection-capa.integration.spec.ts` 验证“计划 -> 两位检查人独立签认 -> all 门槛汇总 -> 去重不符合项 -> CAPA 根因/纠正/预防/证据 -> 验证返工 -> 受权验证人关闭”，并验证四类既有来源的双向链接。

### 阶段 12：M8 Wave 7 迁移、联调、上线与验收
- **状态：** in_progress
- 开始时工作树干净，HEAD 为 `1793702 M8 Wave6完成`。
- 已读取 `AGENTS.md`、M8 需求、执行计划/backlog、Wave 7 prompt、Wave 1-5 验收和 Wave 6 设计/prompt。
- 前置审计发现 Wave 6 安全验收文件缺失，执行计划 Wave 6 状态也未回填；不将完成提交自动视为验收通过。
- 下一步：读完验收模板、测试策略、真机矩阵、上线 runbook、监控基线和操作手册，形成实施设计并处理前置缺口。
- 已新增 Wave 7 批次/逐行对账 schema、四类存量迁移器、CLI 和 PostgreSQL 集成测试；补齐目录审计发现的 25 个外键支撑索引。
- 专项集成测试 5/5 通过：分类/迁移/重放/回滚、逐行失败隔离、100 条性能批次、全外键索引、22 个 migration 全量 down/up/重复 up。
- 本地迁移 CLI 首次被 pnpm 传入的 `--` 阻断，已定位为参数解析问题；当时只有 schema migration 生效，未生成数据批次。
- 本地实际数据演练批次 `aad4f174-892a-42d8-bb6d-0005a3e5ee5c`：来源/创建/跳过/失败/链接均为 0，同 request 重放返回原批次，回滚 0/保留 0；明确不以空数据演练代替生产对账。
- 合成迁移证据：四类 4/4 创建、4/4 链接、4/4 来源不变，并发重放 4 条全跳过，回滚 4/4 且可再迁移；100 条最新用时 550ms。
- 独立 code reviewer 因外部用量限制未返回结论，不将其标记为 review 通过；已用同一清单自审并修正快照覆盖、只读保护和回滚保留边界。
- 最终完整命令链通过：`generate-doc-inventory` 267、`check-doc-index` 267、API lint、API unit 16/79、API integration 18/78、Web 61/238、API/Web build、21 份 OpenAPI、`git diff --check`；自动化共 395 项、0 失败。
- 验收结论：Wave 6 通过；Wave 7 不通过；M8 总验收不通过且 M9 不得启动，直到企微真机、生产存量和备份恢复证据齐全。

### 阶段 13：M8 最终功能核查、归档与 M9 暂停
- **状态：** in_progress
- 用户修订验收口径：三端真机、生产存量和生产恢复不阻断 M8 归档，三端真机由用户在任务后自行执行。
- 已逐条核查 M8 八项成功标准与 Wave 1-7 的代码、OpenAPI、migration、前端路由和自动化证据；未发现缺失的 P0/P1 功能。
- 已将 Wave 7 和 M8 总验收更新为通过，同时在验收、真机矩阵、迁移对账和上线包中保留现场项“未执行”的真实状态。
- 已创建 `docs/archive/audits/M8-最终功能实现核查.md`，记录 395 项自动化、21 份 OpenAPI、22 个 migration、迁移对账、缺陷与范围边界。
- 已归档 M8 计划/backlog/提示词，并将 M9 路线、计划、backlog、提示词独立封存到 `docs/archive/paused/m9/`。
- 归档后的 inventory 生成和索引检查通过（269 份 Markdown），`git diff --check` 通过；下一步运行最终完整质量门禁。
- 最终新鲜门禁全部通过：API lint；API unit 16 suites / 79 tests；API integration 18 suites / 78 tests；Web 61 files / 238 tests；API/Web build；21/21 OpenAPI；269 份 Markdown inventory/index；`git diff --check`。
- 自动化最终合计 395 项、失败 0。Node v24.18.0 相对项目声明 20.x 产生 engine warning，但全部命令退出 0；该环境偏差已在最终核查中单列。
- 最终结论：M8 总验收通过并完成归档；未上线；三端真机保持未执行并由用户后续完成；M9 暂停包已就绪且不会自动启动。
