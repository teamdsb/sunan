---
status: operations
owner: planning
updated: 2026-08-19
replaces: []
replaced_by: []
---
# 发现与决策

## 2026-08-19：手册最终真实性收口
- 工作平台考勤页面源码只有月份筛选、统计卡片和模块明细，没有导出或财务对账按钮；手册已删除对应步骤和图注。
- 工作平台记录详情源码提供打印 A4/A3、附件、签名和定位证据，没有异步导出任务；手册已删除该能力描述。
- 通用工作平台与安全 CAPA 页面当前只有证据新增/绑定，没有证据替换、解除或归档按钮；采购草稿详情的“解除关联”是当前 H5 明确提供的唯一解除动作，且需要原因、不删除原文件。
- CAPA 关闭条件由后端门槛控制，当前 H5 只按权限显示“验证关闭”或返回“关闭门槛未满足”，不展示可编辑的逐项门槛清单；手册已将截图要求改为按钮/失败提示。
- 最终 DOCX 目录页码来自 146 页 A4 PDF 的逐页文本反查，而不是沿用旧版本静态页码；页码为 `3, 7, 9, 20, 31, 50, 58, 84, 98, 131, 133, 136, 138, 143, 144, 145`。

## 2026-08-16：新一轮优化版本发布（初始）
- 用户明确说明在 0.0.6 生产发布后又完成了更新优化，并授权再次发布。
- 上次生产基线是 API/Web/Nginx `0.0.6`，数据库 23 条 migration，回滚源、`.env`/Compose 和 DB/配置/Redis 备份均有明确证据。
- 本次尚未确定新改动范围、当前本地版本元数据、生产实际状态和是否新增 migration；必须先读取证据，不覆盖旧镜像标签。
- 当前 Git 为 `main`，HEAD/origin 均为 `82174a2`；除本次规划文件外无未提交业务改动。
- 上次生产发布已由 `d4fa1a8` (`Deploy/8.10 2:00`) 纳入 Git；此后用户新增 `db392c0` (`fix(app): restore detail navigation and optimize PDF delivery`) 和 `82174a2` (`docs(handbook): update illustrated operation manual`)。
- 当前 11 个版本/部署真源仍统一为 `0.0.6`，本次需使用唯一新镜像标签；按现有补丁发布规则确定目标为 `0.0.7`，不重用/覆盖生产 `0.0.6` 镜像。
- 当前 migration 文件仍为 23 份，`d4fa1a8..HEAD` 和工作树都没有 migration 改动；预期是无 schema 变更的 API/Web/Nginx 应用发布。
- 新增 API 依赖 `subset-font@2.5.0` 用于采购 PDF 中文字体裁剪，依赖链为纯 Node/JavaScript/WASM 包；API Dockerfile 的生产依赖部署会纳入该包及 Noto Sans SC 字体，最终仍需在 Node 20 镜像内执行实际 PDF 字体裁剪验证。
- 生产只读预检确认现网 API/Web/Nginx 为 `0.0.6`，Compose 有效、六个长期服务正常、23 条 migration、live/ready/Web/采购直达路由正常，近 30 分钟 API/Nginx 错误计数为 0。
- 服务器根盘仅余约 1.4 GB；Docker 报告 26.72 GB 未被活动容器引用的可回收构建缓存。构建前只清理可重建 build cache，不删除生产镜像、容器、卷或持久化数据。
- 11 个版本/部署真源已统一更新为 `0.0.7`；`apps/web/src` 无 `SUNAN_VERSION` 或 `0.0.7` 引用，未增加页面版本显示。
- 发布前门禁通过：Web 60 files / 263 tests，API unit 22 suites / 116 tests，API integration 18 suites / 81 tests，共 460 项、0 失败；API/Web build、API lint、21/21 OpenAPI、278 份 Markdown 索引和 `git diff --check` 均通过。
- 标准 API unit 在本机 Node 24 下提示并行 worker 强制退出，但命令退出 0；同一 22 suites / 116 tests 使用 `--detectOpenHandles --runInBand` 新鲜复跑通过且无句柄报告，不构成业务回归。生产构建仍固定使用项目要求的 Node 20。
- 生产发布前备份批次 `20260816214224` 已验证：PostgreSQL custom dump 275,340 bytes / 565 entries、配置归档 13,058 bytes、Redis 时间点 RDB 1,878 bytes，SHA-256 清单通过。
- 构建前只回收未使用的 Docker build cache，实际释放 27.59 GB；活动镜像、容器和数据未删除。`/var/lib/docker` 与 `/dev/sunan` 是不同文件系统，构建数据盘回收后余 68 GB，源码分区余约 1.4 GB。
- `0.0.7` 源码批次 `20260816214919` 已完成版本、敏感环境文件排除、23 条 migration 和 6 个关键 SHA-256 校验，并原子切换；旧源码回滚点为 `/dev/sunan/sunan-source/backup-20260816214919`。
- 生产配置批次 `20260816215037` 已备份并原子更新 `.env`/Compose 到 0.0.7，Compose SHA-256 与本地一致；回滚文件为 `.env.bak-20260816215037` 和 `docker-compose.yml.bak-20260816215037`。
- 服务器 Node 20 构建生成 `sunan-api/web/nginx:0.0.7`，OCI version label 均为 0.0.7；API 镜像内 package version 为 0.0.7，采购 PDF 中文字体实际裁剪得到约 80 KB 字体，证明新依赖和 Noto Sans SC 均进入生产镜像。
- 首次 Web 验证使用 GNU `find -printf`，而 Alpine 容器只有 BusyBox `find`，验证失败后自动回切 Web 0.0.6；在旧容器验证兼容 shell glob 后重新切换，5 个关键懒加载资源和 8 条直达路由全部通过。该失败未涉及业务镜像错误。
- 独立复验的前两轮分别被远程 stdin 被 `docker compose exec` 消费、切换到备份目录后未显式指定 Compose 路径阻断；两轮均未采信。修正后完整新鲜复验退出 0，三个应用容器 0.0.7、API healthy、23 migrations、DB/Redis/OSS ready、9/9 SPA 路由、5/5 关键资源、401 鉴权边界、近期 API/Nginx 错误 0、备份/回滚点、证书和 timers 全部通过。
- 生产 TLS 证书 CN 为 `qzssncb.com`，有效期至 2026-10-16；企业微信回调 IP 与 certbot timer 均 active。企业微信 iOS/Android/桌面端真实登录和业务操作仍需用户现场验收，自动化 HTTP smoke 不替代该项。

## 2026-08-10：0.0.6 生产发布（初始）
- 用户明确授权阅读部署文档、重建所需文件或 Docker 镜像并发布新版本。
- 目标全局版本为 `0.0.6`；不增加前端页面版本展示。
- 需将 `DaFaShiDuDaXue` 加入系统管理员真源，实际形式待从当前代码和生产配置确认。
- 历史 `0.0.4` 发布采用源码同步、服务器构建、数据库/配置/Redis 备份、恢复演练和 API→Web→Nginx 分阶段切流；本次需以当前部署文档和生产实况重新核验。
- 当前 Git 为 `main`，HEAD `6645b51` (`feat(auth): implement WeCom avatar and permission controls`)，相对 `origin/main` ahead 1；除本次三份规划文件外无其他未提交改动。
- 当前全局版本真源是根/API/Web `package.json`、`apps/api/src/config/env.ts`、`deploy/.env.example`、`apps/api/.env.example`，另有两份 Compose 的 OCI label 默认值和运维文档现网标识需同步审核。
- 系统管理员权限唯一真源是生产 `WECOM_SYSTEM_ADMIN_USER_IDS` 逗号分隔白名单，数据库 `is_system_admin` 历史字段不得用于授权。`DaFaShiDuDaXue` 应追加且保留现有值，API 重启后生效。
- 部署唯一运维入口是 `deploy/README.md` 和服务器 `/dev/sunan/deploy/docker-compose.yml`；交付物是源码 + Compose，镜像应在服务器以 `SUNAN_VERSION` tag 构建。
- 发布安全边界要求生产 `.env` 修改前备份、发布前 PostgreSQL 备份、配置备份和源码回滚点；不允许暴露密钥或删除持久化目录。
- 从当前已部署基线 `b245d9e` 到 HEAD 的业务变更不包含新 migration；主要是企业微信头像/OAuth、多部门展示、权限收紧和手册更新。生产仍需核对 migrations 表，但本次预期不产生新 schema 迁移。
- 2026-08-10 01:57 生产只读预检：`SUNAN_VERSION=0.0.5`，API/Web/Nginx 均为 `0.0.5`，API/DB/Redis 健康，公网 live/ready/Web 200，Compose 有效，23 条 migrations 已执行到 `WecomUserDepartmentIds1710000022000`。
- 生产管理员白名单已设置 3 个 UserID，`DaFaShiDuDaXue` 尚不存在；操作时只输出数量和目标存在性，未泄露现有值。
- 生产当前源码的 auth/OAuth 文件哈希与本地 HEAD 不同，Compose 哈希相同；证明需发布新代码，且本地部署结构未产生非预期漂移。
- 生产证书真实路径为 `/etc/letsencrypt/live/qzssncb.com/fullchain.pem`，有效期至 2026-10-16，`certbot.timer` active/enabled；运维清单中 2026-08-17 的旧日期已被自动续签覆盖，不是本次上线阻断项。
- 11 个已验证的版本/部署文件已统一更新为 `0.0.6`；`apps/web/src` 不包含 `SUNAN_VERSION` 或 `0.0.6`，未增加前端页面版本显示。
- 首轮 Web 60 files / 260 tests 通过；API unit 只有 `certificate-reminder-job.service.spec.ts` 的拒绝锁续期用例超过 Jest 5 秒上限，其余115 项通过。
- 系统化调试确认该 service/spec 从已发布基线到 HEAD 没有代码变更；单文件带 `--detectOpenHandles` 为 9/9 通过，失败用例连续 3 次独立运行均在 0.85-0.93 秒通过。当前证据支持首轮 Jest 并行 worker 资源争用导致的一次性墙钟超时，不支持业务回归；仍需全量 unit 新鲜复验确认。
- 全量 API unit 复验为 22/22 suites、116/116 tests 通过，证实首轮单用例超时为一次性测试资源抖动，无需改业务代码或放宽超时。
- API integration 首轮独立运行的 18 个套件统一在 Testcontainers 容器启动前失败，错误为本机无可用 Docker runtime，81 个业务用例均未执行；这是环境门禁，不是业务失败。
- 启动 Docker Desktop 并确认 server 29.6.1 后重跑 integration：15/18 suites、72/81 tests 通过。`enterprise-policy` 和 `master-data` 在并发启动 PostgreSQL 时等待主机端口绑定超过 Testcontainers 10 秒；`certificate` 的列表筛选请求单次返回 401。需对这 3 个套件串行隔离复现，不应将容器启动失败误当业务断言。
- 上述 3 个失败 integration 套件串行 `--detectOpenHandles` 为 3/3 suites、11/11 tests 通过，证照 401 未复现，不支持认证回归。
- 下一轮全量 integration 为 17/18 suites、80/81 tests 通过，仅 `ship-monitor` 用例在 120 秒超时；该用例在上一轮已通过。结束后发现其 Jest 子进程未随 pnpm 退出，且仍持有 Testcontainers 异步资源；终止该本轮遗留测试进程后，单套件 `--detectOpenHandles` 在 6.06 秒内通过，业务用例自身仅 86 ms。
- 清理本轮遗留测试进程、Docker 充分就绪后，标准 API integration 全量命令新鲜通过：18/18 suites、81/81 tests，用时 72.627 秒。系统化调试结论是本机 Docker 冷启动和失败套件遗留异步资源导致的环境/时序抖动，无业务回归证据。
- 发布前门禁最终结果：Web 60 files / 260 tests、API unit 22 suites / 116 tests、API integration 18 suites / 81 tests，合计 457 tests；Web/API build、API lint、21/21 OpenAPI、278 份 Markdown 索引和 `git diff --check` 均通过。
- 生产发布前备份批次 `20260810022219` 已完成：PostgreSQL custom dump（565 个 list entries）、生产配置归档、Redis 时间点 RDB；三份均非空、mode 600、SHA-256 清单校验通过。
- 首次源码流式上传因远端 stdin 同时用于 heredoc 和 tar 而在解包前失败；失败上传目录为 0 字节/0 文件，现网容器、健康检查和 `current` 0.0.5 全部未变。精确空目录已用 `rmdir` 移除。
- 改用单一 stdin 后，`0.0.6` 源码已于批次 `20260810022504` 完成版本、敏感环境文件排除和 auth/OAuth/Compose 哈希校验，并原子切换为新构建上下文。旧源码保留为 `/dev/sunan/sunan-source/backup-20260810022504`；运行容器仍是 0.0.5。
- 生产配置批次 `20260810022733` 已原子更新：`SUNAN_VERSION=0.0.6`，管理员白名单从 3 个增为 4 个且目标 UserID 存在；现有值未输出。`.env` 与 Compose 回滚文件均已保留，Compose 校验通过，运行容器仍是 0.0.5。
- 生产镜像批次 `20260810022801` 构建成功：`sunan-api:0.0.6` (169,484,385 bytes)、`sunan-web:0.0.6` (27,021,122 bytes)、`sunan-nginx:0.0.6` (26,054,032 bytes)，三个 OCI version label 均为 `0.0.6`。远端构建使用 Dockerfile 固定 Node 20，日志已保存。
- API 已分阶段切换到 `sunan-api:0.0.6`：容器 healthy，OCI/进程版本均为 0.0.6，公网 live/ready 通过，migrations 保持 23 且最新名称不变，近 5 分钟 API 错误计数为 0，自动回切未触发。
- API 容器内管理员白名单为 4 个且目标 UserID 存在；生产 `wecom_users` 中 `DaFaShiDuDaXue` 已有 1 条用户记录，因此配置重启后已具备系统管理员角色判定条件，无需伪造或修改历史 `is_system_admin` 字段。
- Web 与 Nginx 已分阶段切换到 0.0.6；Nginx 配置检查、8 条 SPA 直达路由、5 个公网版本化 JS/CSS 资源、受保护 API 401 边界、API ready 和近期 API/Nginx 错误计数均通过，自动回滚未触发。
- 按 `verification-before-completion` 完成独立新鲜复验：三个应用容器均运行 0.0.6，API healthy，源码和运行 Compose 哈希与本地匹配，备份清单复验通过，无 upload 目录或一次性容器残留，证书至 2026-10-16，certbot/企微 IP timer 均 active。
- 完整回滚点：源码 `/dev/sunan/sunan-source/backup-20260810022504`，环境 `/dev/sunan/deploy/.env.bak-20260810022733`，Compose `/dev/sunan/deploy/docker-compose.yml.bak-20260810022733`，数据/配置/Redis 备份批次 `20260810022219`。

## 2026-08-09：企业微信头像、多部门与权限收口
- OAuth 已升级为 `snsapi_privateinfo`，已有 JWT 但缺少 `snsapi_privateinfo-v1` 标记的旧会话需重新授权一次，才能获得 `user_ticket` 并调用敏感成员信息接口刷新头像。
- 定向测试已稳定复现：`RequireAuth.auth.test.tsx` 完整 mock OAuth 模块，使 `loginSucceeded` 调用的 `persistToken` 不存在；`AppRoutes.test.tsx` 只写入 token，未写入新授权版本，因此受保护路由正确进入 OAuth 重新授权页。
- 修复边界固定为测试初始化：部分 mock OAuth 模块并保留真实存储函数；路由测试在 `beforeEach` 写入导出的当前授权版本常量。
- 自审发现多人检查的动作集未区分“当前用户已签认”；此时接口会拒绝再次保存/提交，但前端仍可能显示入口。将在后端 `availableActions` 中按个人提交状态收口，其他未提交参与人不受影响。
- 独立审查确认数据库 `is_system_admin` 不能继续作为权限或通知收件依据；运行时管理员唯一真源固定为 `WECOM_SYSTEM_ADMIN_USER_IDS`，撤销配置后重启 API 即生效。
- 监控端口属于系统配置，权限矩阵明确只允许 `system_admin` 写；部门内容管理角色只读启用入口，不能复用证照/资料/制度的管理 helper。
- CAPA 的 `availableActions` 与写接口必须使用同一状态机：只有 `in_progress` 可改根因、新增措施或请求验证，待验证、已验证、已关闭均返回 409。
- 企业制度的版本废弃范围必须包含 `department_code`，否则部门管理员发布同编码新版本会修改其他部门记录；版本历史同步按同部门读取。
- `privateInfoAuthorized` 用于区分“OAuth 登录成功”和“敏感资料实际获取成功”；失败不再永久标记授权完成，而是在 24 小时冷却后自动重试，避免立即循环和永久缺头像。

## 2026-08-05：升级版操作手册与 Word 交付
- 用户确认系统再次升级，要求基于当前项目完善操作手册，同时参考外部《应用软件说明书-匠芯云链小程序》并交付 Markdown 与 DOCX 两种格式。
- 正式版需要为用户后续嵌入的 4:3 截图预留清晰占位，不把参考说明书中的其他产品名称、功能或流程直接移植到苏南系统。
- 当前仓库 HEAD 为 `b245d9e`，工作树开始时干净；7 月手册完成后已有多次前端、文件和认证相关升级，必须重新核对实际页面与当前规格。
- 参考 DOCX 为 2.9 MB、A4 纵向单节文档，页边距约上 1.8 cm、右 2.1 cm、下 1.7 cm、左 2.1 cm；正文大量使用表格组织截图与步骤，包含 15 张表、8 个内嵌图片，普通段落只有 42 段。
- 参考稿的内容骨架是“文档说明—功能总览与通用操作—逐功能操作流程—常见异常—覆盖汇总”，适合借鉴其连续演示和图文对应方式，但苏南手册需保留企业微信、角色/数据范围、审批/证据和安全闭环等更复杂章节。
- 参考稿共 11 页：封面使用居中标识、系统名、黑底白字“应用软件说明书（用户操作手册）”标题带和三行元数据表；正文页使用页眉、页码、黑色层级标题及细边框表格。
- 参考稿的核心图文页采用“左侧完整界面截图、右侧操作流程/预期结果/界面要点”的双栏表格。苏南后续截图为 4:3 横向比例，若直接照搬双栏会导致截图过窄；更适合采用全宽 4:3 占位框，下方或后一栏承载步骤说明。
- 当前产品版本真源已统一为 `0.0.5`。现手册在 8 月发布提交中只改了版本号和核对日期，正文没有吸收同日升级的真实 UI、文件、认证和权限变化。
- 8 月升级涉及前后端的企业微信头像/部门映射、多部门角色解析、统一附件列表与预览弹窗、HEIC 转换、采购报表展示、跨模块间距与按钮显隐等；这些是本轮正文差异核对重点。
- 当前路由主结构仍为“我的、办事、采购管理、工作平台”，安全任务/计划/检查/问题继续位于工作平台深链；本轮应更新操作细节和截图点，不虚构新的一级导航。
- 源码确认通用附件现支持 PDF、JPG/JPEG、PNG、DOC/DOCX、XLS/XLSX、TXT、CSV、HEIC、ZIP、RAR、WPS、ET、DPS；企业资料/采购/会议/工作台单文件 20MB，企业制度 50MB。证照仍只支持 PDF/JPG/JPEG/PNG 20MB，检查照片仍只支持 JPG/JPEG/PNG 10MB。
- 上传区会先显示服务端返回的允许格式和大小，策略加载失败时禁用上传并提供“重新加载”；本地选择后可显示进度、失败原因和原文件重试。
- 系统内直接预览 PDF、普通图片、HEIC、TXT、CSV；TXT/CSV 最多读取 2MB，CSV 最多 500 行、50 列。Office/WPS/压缩包显示文件信息并提供下载，不解析内容。附件列表统一显示“预览”“下载”，每次动作重新获取受权短期地址。
- 用户头像现已覆盖“我的”首页、桌面右上角、移动顶部和移动抽屉，缺失或加载失败时回退姓名首字；多部门名称去重后用“ / ”连接，存在具体部门时隐藏组织根部门/待设置部门。
- 报表审批单详情已从技术 JSON 改为业务标题、状态概览、统计周期、所属部门、审批通道、采购总额、采购单数、汇总维度、参数快照、汇总表和审批进度/记录；“预览 PDF”和“导出 PDF”为两个独立动作。
- 统一附件列表已实际接入电子证照、企业资料、企业制度、采购单和工作平台证据；这些页面的已绑定文件均可从业务记录级授权入口预览或下载。检查执行与 CAPA 证据继续使用专用图片上传限制。
- 现手册的文件限制仍是旧格式集合，并错误写成“预览依赖企业微信”；必须改为系统内预览为默认能力、企业微信仅增强拍照，并说明不支持直接解析的格式仍可下载。
- 现手册只写报表审批单的参数/汇总快照和“导出 PDF”，没有覆盖升级后的业务标题、指标卡、业务化参数、汇总表、四步审批进度以及独立“预览 PDF”按钮。
- 现手册角色说明只说角色来自部门/职务/管理员身份，需补充多部门权限并集、系统管理员独立白名单、企业微信头像显示及头像失败回退，但不暴露内部部门 ID 映射表给普通用户。
- 采购单详情与报表审批单详情均已实际提供“预览 PDF”和“导出 PDF”：预览在系统弹窗内打开，导出走下载；现手册两个章节都只写导出，需同步修正。
- 现手册保留 64 项截图清单但正文只有 9 个聚合式文字占位，不能满足方案 A 的逐图替换要求。本轮将把清单升级为正文中的可见 4:3 占位图，并用 A/B/C 子图覆盖同一流程的多页面或多状态。
- 截图清单需要随 `0.0.5` 调整：补入企业微信头像/多部门、上传限制、系统内预览、不支持格式下载、报表业务摘要/PDF 预览；删除或改写与当前入口不一致的“安全快捷入口”等描述。
- Markdown 正文现已布置 75 个实际 4:3 占位图，其中第 1 章 1 个为替换示例，正式待补截图为 74 个：登录导航 6、通用文件 3、我的 14、办事 5、采购 12、工作平台 8、安全管理 26。
- 多图场景已按字母子图排列，例如企业微信入口 3 张、采购报表 4 张、任务中心 5 张、现场检查 4 张、CAPA 7 张；每张均使用同一 1200×900 SVG 占位资源。
- DOCX 运行时已确认支持 `docx`、`sharp` 和 `features.updateFields`，可用 docx-js 生成 A4、目录、页眉页码、表格及把 SVG 统一转为嵌入式 PNG。
- Word 初版已从 Markdown 单一真源生成，嵌入 75 张实际 PNG 图位；OOXML 校验器统计 1,791 个段落并报告全部验证通过。校验环境需用 Python 3.12，同时隔离加载系统已有的纯 Python `defusedxml`，避免 Python 3.9 的 `lxml` 扩展污染 3.12 运行时。
- Word 的动态目录域在 Word 中可更新，但 LibreOffice PDF 渲染不会自动展开；为保证跨查看器可见性，交付版采用从 Markdown 16 个一级章标题生成的静态目录，并以最终 132 页 A4 渲染结果校正页码。内部书签因当前 docx-js 的数字 ID 冲突未保留，不影响目录可读和 Word 导航窗格使用。
- 最终交付门禁通过：Markdown 为 16 章，含 75 个实际 4:3 图位和 75 个唯一图注；除第 1 章替换示例外有 74 个正式截图位。Word 中存在 75 个尺寸完全一致的 4:3 绘图对象，渲染为 132 页 A4，压缩包和 OOXML 均无错误。
- 正式手册及其渲染文本没有 M9、Wave/波次、里程碑、backlog、execplan、参考产品名称、旧版本号、旧核对日期或未决占位词；不会把暂停计划或其他产品内容写成苏南当前能力。

## 2026-07-14：苏南操作手册全面更新
- 用户要求阅读分析整个项目，全面、详细更新 `docs/handbook` 下的苏南操作手册。
- 本轮以当前需求、当前规格和 `apps/web/src` 实际路由/页面为证据；归档计划只作历史参考，暂停的 M9 不写成现有功能。
- `docs/handbook` 当前有 4 份文档，主更新目标为 `docs/handbook/苏南船舶管理系统操作手册.md`；M8 培训材料和平台对比文档作为补充输入，不替代当前实现核验。
- 当前生产版本证据为 `0.0.4`；企业微信是主要运行容器，手册应优先说明工作台直达、OAuth 恢复和移动端短任务流程，而不是假定用户总从 `/my` 开始。
- 主手册当前为 859 行，已覆盖四大板块和安全主链概览，但安全管理只有概览，没有按实际专用页面说明安全主数据、计划、任务、检查模板/计划、检查执行、问题、CAPA、独立验证和返工。
- 当前前端路由还包含采购预算、报表申请详情、任务详情、计划详情、检查模板、检查计划、检查列表/详情、问题列表/详情等入口，主手册需要补齐。
- 参考平台 PC/小程序手册为 4749 行且标记 `audit-snapshot`，不能作为苏南现状直接照录；可用来检查业务术语和训练场景，但每项操作必须由当前规格与代码证实。
- 主手册应继续集中维护在一个可搜索文件中，并增加角色化快速上手、入口地图、统一交互、逐模块操作、状态/权限矩阵、移动现场、管理员排障、FAQ、合规和截图验收清单。
- 采购当前默认走系统内审批；企业微信原生审批字段为预留能力，不能在主流程中写成已经启用。采购单状态为草稿、已提交、部门通过、终审通过、已驳回；报表审批增加财务通过节点。
- 采购详情支持上传绑定、下载和解除附件关联；解除必须填写原因，操作只解除业务关联、不删除原文件。采购还包含近 3 年查询边界、年度预算管理、预算审计和报表审批单参数/汇总快照。
- 安全主数据 H5 当前提供船舶/人员/设备类型切换、受控搜索选择器和有效档案查看，页面未提供普通用户直接新建/编辑按钮；治理能力不能写成当前 H5 的普通操作。
- 检查模板 H5 当前创建包含一个首检查项的草稿；可见列表只展示是否已有当前版本，页面没有发布按钮。检查计划使用已发布模板版本，要求负责人、可选协作检查人、首次检查时间，当前页面按一次性、全部完成、60 分钟时限创建。
- 任务中心范围固定为待办、我发起、我参与、已完成、逾期；列表/日历来自同一任务查询。日历按 Asia/Shanghai 分月，日期格最多直显两个任务，更多任务显示数量标签。
- 任务详情仅渲染后端 `availableActions`：开始/完成直接执行；阻塞、改期、取消、催办、升级、代理、转移必须在弹窗填写原因，其中改期填新计划/截止时间，代理填代理人和有效期，转移填新负责人。详情还显示企业微信消息投递、失败重试、参与人、转移/代理记录和动作时间线。
- 通用安全计划支持年度、月度、周期和单次；计划项字段为任务名称、负责人、可选参与人、首次执行时间、月度日期/周期天数、all/any/quorum 完成规则和办理时限。计划草稿至少有计划项后才能启用；暂停不取消历史任务，退役不可恢复。
- 现场检查按固定模板版本逐项填写符合/不符合/不适用、说明和按规则要求的证据；每名参与人独立保存并上传签名后提交，只有出现 `summarize` 动作且完成门槛满足时才能汇总。
- 问题/CAPA 当前页面覆盖来源回链、等级/状态、指定独立验证人、五问法根因、纠正/预防措施、责任人和期限、完成说明+至少一份证据、措施接受、提交验证、验证通过/返工、验证关闭。关闭必须满足根因、纠正与预防措施、全部必要措施已接受、独立验证通过和有效性评价等门槛。
- 现手册把“企业资料”误写成公司统一社会信用代码/联系人主档；实际页面的资料条目只分资质/公告，新建字段为标题和分类，详情维护标题、分类、草稿/已发布/已归档、描述和附件，并支持删除。
- 企业制度新建字段为制度标题、制度编码、版本；列表支持关键字/状态筛选和发布，详情维护标题、草稿/已发布/已废弃、摘要、附件，并显示版本历史。
- 电子证照支持船舶、车辆、人员、设备四类持有对象；新增使用受控持有对象和证照类型，字段含标题、编号、签发日、到期日、提前提醒天数、签发机构、状态、备注和附件。详情页当前只编辑标题、到期日、状态和新增附件。
- 提醒看板分待处理、已逾期、已确认，支持按对象/证书类型汇总与列表筛选；有权限人员可触发异步手动扫描，接收人或管理角色可确认提醒。设置的提醒视图、证照分组和推送开关改动后自动保存，失败会回滚。
- 船舶监控管理页实际新增字段为船舶 ID、监控名称、监控地址；普通用户仅见启用入口，管理角色可见全部并新增，当前 H5 没有编辑/停用操作按钮。
- 文件限制：证照 PDF/JPG/PNG/JPEG 20MB；制度 PDF/DOC/DOCX 50MB；采购附件 PDF/JPG/PNG/DOC/DOCX/XLS/XLSX 20MB；检查照片 JPG/PNG/JPEG 10MB；通用附件同采购附件 20MB。预览依赖企业微信 JS-SDK，下载 URL 有效期短，不应长期转发。
- 主手册已重构为 1929 行、16 章，新增当前版本/边界、角色与职责隔离、路由地图、通用状态/上传/审批/导出、逐模块操作、安全专用闭环、移动现场、角色速查、管理员巡检、18 类 FAQ 和 64 项截图清单。
- 自检确认主手册不存在重复标题或 TODO/TBD；M9、小程序、mock、模板发布按钮、采购附件时机等只出现在明确的范围边界或风险说明中。
- `docs/README.md` 已有“苏南平台操作手册”当前入口，不需要新增导航文件；后续只需更新该索引日期/说明（如必要）并重新生成 inventory。
- 二次代码复核确认工作平台首页固定入口只有考勤统计、审批看板和既有模块卡片；安全主数据/计划/任务/模板/检查/问题路由存在但没有全部加入侧栏或首页按钮。手册已改为说明企业微信独立工作台深链、任务消息、来源回链、检查计划链接或管理员配置入口。
- 采购审批的 `return` 回到 `draft`，可编辑并因保留既有提交时间显示“重新提交”；`reject` 进入只读 `rejected`。采购单和报表详情的 PDF 按钮对有读取权限的当前状态可用，只有终审通过后的版本应作为正式归档件。
- README 导航已使用带版本日期的显示标签，稳定校验点应是 Markdown 链接目标 `handbook/苏南船舶管理系统操作手册.md`，不应把可变的显示文字写死在正则中。

## 需求
- 用户要求阅读仓库文档，规划如何将 M7/M8 推迟到后面。
- 用户要求规划 9 类已发现问题的修复文档。
- 用户要求文档符合仓库标准与格式。
- 用户要求完成每一 M 的 wave 提示词。
- 用户明确“规划好即可”，本轮不实现业务代码。
- 用户最新确认：M1-M6 的修复作为新的 M7，之前的 M7/M8 延后。

## 研究发现
- 仓库没有既有 `task_plan.md`、`findings.md`、`progress.md`。
- `docs/` 已存在当前计划入口：`docs/execplans.md`、`docs/plans/README.md`、`docs/prompts/README.md`。
- M7/M8 当前已有计划与 prompt：`docs/plans/M7-execplans.md`、`docs/plans/M8-execplans.md`、`docs/prompts/m7/`、`docs/prompts/m8/`。
- `docs/execplans.md` 原先写明“M7 为当前待实施里程碑，M8 仅在 M7 总体验收通过后启动”；用户确认后已改为“新 M7 修复优先，原 M7/M8 后移为 M8/M9”。
- `docs/plans/README.md` 原先只索引 M7/M8 当前路线；新增新 M7 修复计划后必须更新此入口。
- `docs/prompts/README.md` 原先标题和内容只覆盖 M7/M8；已扩展为“当前修复与后续升级 Wave 提示词索引”。
- `scripts/check-doc-index.mjs` 固定允许状态值；不能新增 `deferred` 状态。
- 已将当前修复执行计划重排为 `docs/plans/M7-execplans.md` 和 `docs/plans/M7-wave-backlog.md`。
- 已将六份修复提示词移动到 `docs/prompts/m7/`，作为新 M7 Wave 1-6。
- 原 M7 安全管理底座已后移为 M8：需求、执行计划、backlog、提示词目录均使用 M8。
- 原 M8 专业安全深化已后移为 M9：需求、执行计划、backlog、提示词目录均使用 M9。
- `docs/execplans.md`、`docs/plans/README.md`、`docs/prompts/README.md` 已切换为新 M7 当前优先。

## 技术决策
| 决策 | 理由 |
|------|------|
| 用新 M7 承接用户列出的问题 | 问题集中在我的、办事、采购、工作台、文件上传与导航，属于上线体验与导航修复 |
| 将 `docs/execplans.md` 作为重排主入口 | 这是仓库明确的当前执行计划入口，最能避免 Agent 误启动后移的 M8/M9 |
| 将原 M7/M8 后移为 M8/M9 | 符合用户最新命名意图，避免两个 M7 并存 |

## 遇到的问题
| 问题 | 解决方案 |
|------|---------|
| 原 M7/M8 与新 M7 命名冲突 | 将原 M7/M8 整体后移为 M8/M9 |
| 根目录规划文件缺 YAML 头会破坏文档索引校验 | 已补 `status/owner/updated/replaces/replaced_by` |
| 默认 PATH 中找不到 `node` | 使用 Codex bundled Node：`/Users/yuan/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node` |

## 资源
- `AGENTS.md`
- `docs/README.md`
- `docs/inventory.md`
- `docs/execplans.md`
- `docs/plans/README.md`
- `docs/prompts/README.md`

## 2026-07-10：M7 审计与 M8/M9 修复需求
- 当前 `docs/execplans.md` 明确：M7 Wave 1-6 已完成本地最终门禁；M8 规划已建立、等待重新排期；M9 仍依赖 M8 总体验收。
- `docs/prompts/README.md` 索引 M8 七个 Wave 和 M9 八个 Wave 的提示词；是否每个文件实际存在、内容是否覆盖用户新报问题，仍待核实。
- 用户报告的缺口：采购见面进入“采购执行清单”的详情页后，已上传附件只有继续添加入口，没有删除能力。用户要求将修复纳入 M8/M9 升级，而非在本轮直接改业务代码。
- “M7 已全部实现”不能仅据计划自述下结论；需核对六个 Wave 验收记录、对应代码/测试与工作树状态，区分本地门禁、完整回归与生产验收。
- 初步范围对照：M7 Wave 3 的计划与提示词要求“附件绑定、预览、下载、权限回归”和视觉优化，未把“删除已绑定附件”写为验收项；这解释了该能力未被 M7 既有验收明确覆盖。
- M8 已有最贴近的承载点：`M8-W3A-1`（通用附件组件）在 backlog 中已写“选择、上传、进度、预览、删除”，而 Wave 3 提示词正文尚未明确采购执行清单详情页必须接入、已绑定附件必须可删除。因此更可能是 M8 Wave 3 的范围细化/回归缺口，而不是需要推迟到 M9。
- M7 的六份验收材料均为“有条件通过”，而 Wave 6 明确其结论是：无已知 P0/P1、仅余企业微信 iOS/Android/桌面真机截图或录屏 P2；该 P2 不阻断 M8 重新排期，但阻断生产发布前的最终截图包。
- M7 Wave 3 自动化记录覆盖采购附件上传、绑定、预览、下载及下载权限；验收记录没有删除附件的测试、API 或 UI 证据。用户新发现的行为因此不能被表述为“已通过的 M7 功能回归”，而是 M7 原范围外的真实缺口。
- 所以对“ M7 是否全部实现”的准确结论只能是：M7 **计划内的 P0/P1 已按本地自动化门禁实现并有条件验收**；但尚无企业微信真机生产证据，且新报的附件删除能力未被 M7 需求覆盖，不能笼统称为“全部完成”。
- 代码核对证实该缺口真实存在：采购后端只有附件绑定 `POST /procurement/orders/:id/attachments` 与受采购单权限保护的下载 URL `GET .../attachments/:fileId/download-url`，没有解除关联的 `DELETE` 路由；详情页也只渲染预览和下载按钮。因此必须补“解除采购单—文件关联”的受权接口、UI 删除/确认/刷新行为和 API/Web 集成回归，不能直接删除 OSS 文件或全局 `files` 元数据。
- M8 全部 7 个 Wave 提示词均存在，内容齐全且有前置条件、工作包、验证/验收要求。M8 Wave 3 正文已有“证据替换、删除和归档必须审计”，但限定为工作平台全模块；应显式扩展为复用既有采购单附件详情，并指定解除关联语义与回归测试。
- M9 全部 8 个 Wave 提示词也均存在，且 M9 Wave 1 要求先回归 M8 的证据能力。附件删除缺口不应放入 M9：M9 是 M8 验收后的专业业务深化，若把该通用底座缺口推到 M9，会违反 M9 必须复用已验收 M8 证据服务的前置。
- 当前终端默认 `PATH` 未配置 Node，首次 M7 验证命令均在启动前以 `env: node: No such file or directory` 失败；已从工作区依赖发现可用 Node/Pnpm 绝对路径，待以该运行时重跑。此错误不代表代码或测试失败。
- 第二次使用 bundled Node/Pnpm 重跑时，PnPM 因现有 `node_modules` 与运行时不匹配，试图自动执行 install 并在无 TTY 下以 `ERR_PNPM_ABORTED_REMOVE_MODULES_DIR_NO_TTY` 退出；为避免删除或重装用户依赖，未设置 `CI=true` 强行继续。因此本轮不能把当前分支测试/构建标为已通过。`node scripts/check-doc-index.mjs` 已在 bundled Node 下通过（227 份 Markdown）。
- 修复方案必须采用“解除采购单与文件的关联（unlink）”而不是删除 OSS 对象或全局 `files` 元数据：同一文件可被其他业务引用，且 M8 的证据不可静默删除要求需要审计删除人、时间、原因和关联对象。删除权限应复用采购草稿编辑权限；已提交/审批记录不得无审计地移除证据。
- 用户于 2026-07-10 确认已完成 M7 真机验证并授权 M7 结束归档。Wave 6 验收已据此从“有条件通过”更新为“通过”；未虚构设备型号、版本或截图索引。
- M7 执行计划、backlog 和六份 Wave 提示词已迁入 `docs/archive/execplans/`、`docs/archive/backlogs/common/`、`docs/archive/prompts/m7/`，当前入口切换至 M8 Wave 1。
- 用户已批准推荐方案：M8 Wave 3 实施采购附件受审计解除关联，M9 Wave 1 回归该基线。已同步需求、路线图、M8/M9 执行计划/backlog、M8 Wave 3 与 M9 Wave 1 提示词、safety README 和索引。

## 2026-07-10：M8 Wave 1 文档冻结
- 本 Wave 已由用户定义为“安全管理底座的文档、架构、术语、规格目录和验收门禁”，不实现业务代码。
- 必须以需求、路线图、执行计划、backlog、平台功能对比建议、通用规格、工作平台规格与 safety 入口为真源；关键现状判断须以代码、接口或测试文件为证。
- 范围边界已明确：不新增第五个一级导航；不接外部监管、AIS、CCTV；不建设小程序；不得创建未评审的生产表、Controller、页面或占位接口。
- M8 需求、路线图、执行计划和 backlog 一致要求：Wave 1 冻结边界、术语、状态、规格清单、测试/迁移/验收/提示词门禁；Wave 2-7 的实现必须顺序受 Wave 验收约束。
- `docs/specs/safety/README.md` 已列出 Wave 2-6 的预期 API/DB/state/UI 文件名，但 Wave 1 两份文档尚为“待编写”；当前目录不能被表述为已评审实现规格。
- 通用 API 规格必须使用 `/api/v1`、复数资源、统一 `data` 响应、标准错误与软删除语义；DB 规格必须冻结 UUID、审计列、软删除、FK、索引、up/down migration 与 PostgreSQL testcontainers 验证约束。
- 代码差距基线已确认：四个一级导航由 `AppShell.tsx` 固定；工作平台的通用记录/步骤/附件已由 `WorkbenchController` 和三张 `workbench_record*` 实体承载；采购附件仅有绑定与下载接口，详情页与测试均没有删除操作；文件服务已有采购和工作平台分类测试。
- 已将任务唯一完成状态冻结为 `completed`，并同步修正 M8 backlog 中的 `done`，避免状态词典冲突。

## 2026-07-10：M8 Wave 2 启动
- Wave 1 验收证据 `docs/archive/acceptance/safety/acceptance-m8-wave1.md` 存在且状态为“通过”，无 P0/P1 blocker；Wave 2 前置满足。
- Wave 2 的首个实现范围限定为既有工作平台记录的记录级授权、步骤参与人、多人完成、状态动作和审计，不提前实现 Wave 3 证据模型或 Wave 5/6 的独立任务、检查、CAPA 实体。
- 测试运行环境根因已确认：默认 PATH 无 Node；bundled Node 为 v24，但项目声明 Node 20.x，pnpm 因现有 `node_modules` 的运行时/链接状态尝试清理并在非交互环境以 `ERR_PNPM_ABORTED_REMOVE_MODULES_DIR_NO_TTY` 终止。未强制重装，以免破坏用户本地依赖；尚未进入 Jest 断言阶段。
- 直接使用现有 `apps/api/node_modules/.bin/jest` 规避 pnpm 后，TypeScript 编译问题已修正并可加载测试；实际 PostgreSQL 集成测试被 `Could not find a working container runtime strategy` 阻断。根因是本机缺少 Docker/testcontainers runtime，不是测试断言失败。

## 视觉/浏览器发现
- 未使用浏览器或视觉工具。

## 2026-07-12：M8 Wave 6 检查、问题与 CAPA
- Wave 5 已由提交 `5e36c10` 完成；`safety_tasks` 可复用参与人、完成规则、生成幂等、对账和统一待办能力。
- 四类存量来源为 `goa_safety_hazard`、`shipping_self_inspection`、`shipping_vessel_inspection` 与 `shipping_maritime_safety_check`；均属通用 `inspection_rectification` 工作平台记录，Wave 6 必须保留原记录并建立双向链接。
- 已冻结术语规定：不符合项是 `issue_type=nonconformity`，不新增平行不符合表；CAPA、措施和验证维持独立结构化生命周期。
- 用户确认采用独立安全领域对象方案：检查任务保存模板版本快照；按 `all/any/quorum` 汇总；按检查任务和检查项快照生成稳定幂等问题；CAPA 关闭需措施、证据、验证和有效性评价，重大问题限制关闭角色。
- 根目录规划文件本为历史追踪文件。误写入后已用 Git index 原文恢复，后续仅追加本 Wave 记录。

## 2026-07-12：M8 Wave 7 前置审计
- 当前 HEAD 为 `1793702 M8 Wave6完成`，工作树开始时干净。
- `docs/archive/acceptance/safety/` 仅存在 Wave 1-5 验收文档，没有 Wave 6 实际验收文档；Wave 7 的“Wave 1-6 均有通过文档”前置尚未满足。
- `docs/plans/M8-execplans.md` 仍将 `M8-W6A/B/C` 标为未完成，与 Wave 6 完成提交和自动化记录不一致。
- Wave 6 有设计文档、代码、迁移、测试和前序执行记录，但不能因此直接伪造验收结论；需基于新鲜门禁证据补齐 Wave 6 验收文件。
- Wave 3 验收记录已包含用户确认的 iOS/Android 拍照、定位、签名和预览真机结果，但 Wave 7 要求的完整主链路及桌面端回归尚无本轮实际证据，不得写为通过。
- 最终自审发现并修正两个数据保护问题：重放不再更新首次 `issue_sources.source_snapshot`；`legacyReadOnly=true` 来源由 PostgreSQL trigger 拒绝 UPDATE/DELETE，批次回滚删除链接后恢复可写。
- 回滚安全边界补强：存在 CAPA、额外来源或问题动作审计时保留目标问题，不强删。
- 最终完整门禁：API unit 79、API integration 78、Web 238，合计 395 项全通过；API lint、API/Web build、21 份 OpenAPI、267 份 Markdown 索引与 `git diff --check` 全通过。
- 当前无未关闭 P0/P1 代码缺陷，但存在两个 P0 上线门禁（非代码缺陷）：企微三平台真机未执行；生产存量/备份恢复未执行。

## 2026-07-12：M8 最终功能核查与归档口径调整
- 用户明确撤销三端真机、生产存量和生产恢复作为本次 M8 归档阻断项；三端真机将在任务后由用户自行执行。本决策只改变验收范围，不把未执行项改写为通过。
- 按 M8 八项成功标准逐条核查了实际后端模块、前端懒加载路由、OpenAPI、PostgreSQL migration 和测试：ABAC/动作隔离、统一附件/PDF/导出、主数据、计划任务/待办/日历、检查转问题、CAPA 验证关闭和企微消息深链均有实现与自动化证据。
- M8 Wave 1-7 均可按修订口径通过；未关闭 P0/P1 代码缺陷为 0。独立核查记录为 `docs/archive/audits/M8-最终功能实现核查.md`。
- M8 计划、backlog、提示词已迁入 `docs/archive/execplans/`、`docs/archive/backlogs/safety/`、`docs/archive/prompts/m8/`；M8 需求改为历史归档，safety 规格继续作为当前实现基线。
- M9 没有开始任何 Wave，已作为 `conditional-baseline` 独立封存在 `docs/archive/paused/m9/`；M8 通过不会自动触发 M9。
- 归档后最终新鲜门禁全部通过：API unit 79、API integration 78、Web 238，合计 395 项、失败 0；API lint、双端 build、21/21 OpenAPI、269 份 Markdown 索引和 `git diff --check` 均通过。

---
*每执行2次查看/浏览器/搜索操作后更新此文件*
*防止视觉信息丢失*

## 2026-07-12：新版本生产发布
- 用户已明确授权读取部署文档、重建相关文件或 Docker 镜像并上线新版本平台。
- 用户要求同步处理全局版本号，给出的版本口径是 `0.0.4`，且明确不涉及前端页面中的版本展示；需先核对仓库版本真源和现有值，再判断这是目标值还是已存在值。
- 当前分支为 `main`，跟踪 `origin/main`；开始时仅发现 `.superpowers/brainstorm/97677-1783745506/` 下 4 个既有删除项，视为用户已有变更，本次发布不得恢复、覆盖或纳入版本调整。
- 下一步以仓库部署/runbook 文档和实际脚本为准确认发布目标、镜像策略、生产数据库迁移/备份、回滚和验收流程。
- `deploy/deployment-runbook.md` 明确当前生产交付方式不是推送镜像归档，而是把排除本地环境文件/构建产物的源码同步到 `39.106.103.45:/dev/sunan/sunan-source/current`，再由 `/dev/sunan/deploy/docker-compose.yml` 在服务器原地 `up -d --build`。
- 生产域名为 `https://app.qzssncb.com` 与 `https://api.qzssncb.com`；部署前后至少检查 Compose 服务状态、`/api/health`、`/api/health/ready` 和 Web 响应头。
- `deploy/docker-compose.yml`、`deploy/docker-compose.prod.yml` 及 `deploy/.env.example` 当前版本默认值均为 `0.0.3`；因此用户所说“现在版本号是 0.0.4”与仓库状态结合后可明确解释为本次目标版本 `0.0.4`，无需再询问是否升级到 `0.0.5`。
- 架构与企业微信切换文档要求 migration 前完成生产 PostgreSQL 备份；标准同步/构建手册本身没有执行备份命令。本次必须在生产重建前补做可验证备份并记录回滚源，不可只照抄 `up -d --build`。
- Compose 中 API 容器启动命令会自动执行 schema migration 和幂等 seed；新安全领域还存在独立存量迁移 CLI，需在上线前核对生产来源数量并决定是否执行 `classify/run/verify`，不能把 schema migration 与存量业务迁移混为一谈。
- 生产 Compose 使用固定容器名和版本化 API/Web/Nginx 镜像标签；持久化 PostgreSQL、Redis、OSS、日志、证书和企业微信 IP 列表均挂载在 `/dev/sunan/`，源码轮换不会覆盖这些数据卷。
- 全仓产品版本真源共有 6 个受控文件：根 `package.json`、`apps/api/package.json`、`apps/web/package.json`、当前生产 `deploy/docker-compose.yml`、对照快照 `deploy/docker-compose.prod.yml` 和 `deploy/.env.example`；这些位置均仍是 `0.0.3`。`pnpm-lock.yaml` 不记录 workspace 自身版本，现有 `package-lock.json` 的根 package 条目也没有 version 字段，因此不应机械改锁文件。
- Dockerfile 不直接写产品版本；Compose 通过 `SUNAN_VERSION` 同时控制 API/Web/Nginx 镜像 tag 与 OCI version label。前端源码中没有产品版本展示绑定，本次只改 package metadata/部署 metadata，符合“不涉及前端页面版本显示”。
- `deploy/README.md` 声明 `deploy/docker-compose.yml` 是服务器当前真源，`docker-compose.prod.yml` 只是早期快照；发布时必须同步当前 Compose，不能让服务器继续保留 `0.0.3` 默认标签。
- 备份手册给出可验证的 PostgreSQL `pg_dump -Fc` 和 `pg_restore --list`，并建议同时备份生产配置与 Redis AOF；发布手册会自动轮换源码备份。API 容器启动前迁移，因此数据库备份必须先于 `docker compose up`。
- Git 历史提交 `4752c84` 是上一轮 `0.0.2 → 0.0.3` 的全局发布升级，精确联动 11 个文件；本次按同一已验证边界升级为 `0.0.4`，避免遗漏后端默认值、测试期望、环境模板和运维清单。
- 本机 Node 为 v24.18.0（高于仓库声明的 Node 20.x），pnpm 10.33.0、Docker 29.6.1、Compose 5.2.0 和 Docker daemon 均可用；实际镜像构建由 Dockerfile 固定使用 Node 20，发布构建不会依赖宿主 Node 24。
- `git diff --check` 与产品版本残留扫描通过；唯一命中的 `0.0.3` 是依赖 `@nestjs/passport` 的包版本，不是平台版本。
- 本地 `docker compose config --quiet` 因 Compose 中生产绝对路径 `/dev/sunan/deploy/.env` 不存在而拒绝，属于校验环境缺失而非 YAML 解析失败；不能为方便校验把真实生产 `.env` 复制回本地，应在远端用真实路径复验。
- 版本更新后的完整本地测试门禁已新鲜通过：Web 61 files / 238 tests、API unit 16 suites / 79 tests、API PostgreSQL testcontainers integration 18 suites / 78 tests，合计 395 tests、失败 0。
- `pnpm build` 已完成 Web 与 API 生产构建，`pnpm lint` 已完成 API 全量 ESLint，均退出 0；Web 产物维持按路由拆分的独立 chunk。
- 当前共有 21 份 OpenAPI YAML；发布门禁要求全部验证。文档索引生成/检查和 `git diff --check` 也需要在版本文档修改后重新执行。
- 安全存量迁移 CLI 的 `classify` 为只读分类；`run <request-id>` 创建可重放批次并返回/复用批次对账；`verify <batch-id>` 需要实际 batch UUID。生产 runbook 要求在 schema migration 前保存 classify、迁移后 run+verify，不能把 request-id 错当 batch-id。
- 两套发布文档存在重要层级差异：`deploy/deployment-runbook.md` 是日常源码部署流程，但最新企业微信生产切换 runbook 增加了备份、预演、M8 存量迁移和真机/恢复硬门禁。本次生产操作必须采用更严格顺序，不能直接执行日常手册的一步式重建。
- 21/21 份 OpenAPI 已逐份通过 `swagger-cli validate`；文档 inventory 已重建为 269 个 Markdown，`check-doc-index` 和 `git diff --check` 均通过。
- 2026-07-12 22:29 生产只读预检：服务器在线，当前 `SUNAN_VERSION=0.0.3`，API/Web/Nginx 均为 `0.0.3` 且 API/DB/Redis healthy，OSS/Web/Nginx Up；公网 API live/ready 与 Web 200 均正常。
- 生产真实 `.env` 的关键敏感项均为 SET（只核对存在性，未输出值），当前生产 Compose `config --quiet` 通过；企业微信 IP 同步与 certbot timer 均 active。
- 生产磁盘 79G、已用 20G、可用 56G；Docker build cache 约 17G，但空间足够，不需要冒险清理。最近一次数据库/配置/Redis 备份为 2026-07-07，本次上线前必须生成新备份。
- 生产当前源码/镜像仍是 `0.0.3`，数据库 migrations 仅 15 条，最新到 Wave 4/采购预算；当前源码没有安全存量迁移 CLI。新版本将首次带入 Wave 5/6/7 schema 与存量迁移能力，风险显著高于纯版本标签重建，需拆分“构建镜像、classify、schema migration、存量 run/verify、切流”。
- 首次按旧手册在线 tar Redis AOF 时，`appendonly.aof.*.incr.aof` 在读取期间持续增长，tar 返回非零并由 `set -e` 中止。诊断确认 PostgreSQL dump 与配置归档均有效；Redis 归档虽可列目录但不具备一致性保证。
- Redis 当前 AOF 正常、无 rewrite、最近 RDB save 正常，且容器内 `redis-cli` 支持 `--rdb`。根因是备份方法与活跃 AOF 写入冲突；采用复制协议生成时间点 RDB，再用 `redis-check-rdb` 验证，是不停止生产服务且可验证的一致性方案。
- 一致性备份已于 `20260712223040` 完成：PostgreSQL custom dump（258 个 restore entries）、生产配置归档、Redis 时间点 RDB 均已验证并设为 mode 600；三份文件的 SHA-256 清单已保存。失败的在线 AOF tar 已删除，避免被误当可恢复备份。
- 生产需从 15 条 migration 升到 22 条，共新增 7 条：工作流权限、证据审计、证据/导出、主数据、计划任务、检查/CAPA、存量迁移支撑。`up` 路径以新增列（带默认值）、新表/索引/约束/触发器为主，没有删除现有表或列；旧 API 在 schema migration 窗口内保持向后兼容的风险较低。
- `classify` 只查询现有 `workbench_records` 四类模块并计算映射，不依赖新迁移表，因此可用构建好的 `0.0.4` 镜像在 schema migration 前只读执行。`run` 必须等 7 条 schema migration 完成后执行。
- 当前工作区本任务变更与 4 个用户已有 `.superpowers` 删除项可明确区分；发布 tar 应继续排除 `.superpowers`，避免把本地设计会话状态带到生产构建上下文。
- 源码流式包经本地独立验证为 2,816,000 bytes；远端 `upload-20260712223349` 已完整落位，现网 `current` 仍为 `0.0.3`。首次上传命令失败发生在后置校验：本地双引号提前把远端 `$UPLOAD` 展开为空，误查根目录；并非 tar、网络或远端磁盘故障。
- 远端源码已在校验环境文件缺失、版本号和迁移 CLI 后原子切换为 `0.0.4` 构建上下文；旧源码保留为 `/dev/sunan/sunan-source/backup-20260712223349`，运行容器不挂载源码，因此切换期间现网未受影响。
- 生产已构建 `sunan-api:0.0.4`、`sunan-web:0.0.4`、`sunan-nginx:0.0.4`，三者 OCI version label 均为 `0.0.4`；构建日志已保存。现网 API/Web/Nginx 仍运行 `0.0.3`，符合“先构建、后迁移/切流”。
- schema 前安全存量 `classify` 已用 `0.0.4` 镜像只读运行并保存报告，结果 `[]`；生产四类来源记录数为 0，现网 API 仍为 `0.0.3`。
- 首次恢复演练校验脚本的表名/引号/退出码处理不可靠，末尾 `passed` 已明确作废。使用无嵌套引号的 SSH stdin 脚本完整重做后，PostgreSQL dump 成功恢复到临时库：15 条 migrations、4 个企微用户、0 条工作平台记录、9 个文件元数据；所有 SQL 由 `ON_ERROR_STOP` 保护，临时库已确认删除，恢复演练真实通过。
- 生产 schema 已由一次性 `0.0.4` 容器从 15 条成功迁移到 22 条；新增 7 条名称逐一核对通过。迁移后旧 `0.0.3` API 的 live/ready 仍正常，证明 schema 切换未破坏现网旧服务。
- 安全存量批次 `074c54d9-8ac1-4169-81de-8012a9659c04` / request `release-0.0.4-20260712223349` 已完成。run 与独立 verify JSON 完全一致：source/created/skipped/failed/unchanged/linked 全为 0，批次 1 条、映射行 0。
- `docker compose run` 在 SSH stdin heredoc 中会消费后续脚本输入；首次 run 实际成功，缺少的是后续 verify。显式从 `/dev/null` 输入后 verify 与严格 JSON/数据库断言通过，未创建重复批次。
- 服务器实际 Compose 与旧源码 hash 一致、Nginx 挂载配置与新旧源码均一致，未发现运维侧漂移。已备份生产 `.env`/Compose，把实际 Compose 同步到 `0.0.4` 真源并仅修改 `SUNAN_VERSION=0.0.4`；远端 `config --quiet` 通过，运行容器尚未切换。
- API 已单独切换为 `sunan-api:0.0.4`，容器 healthy、OCI label 与进程环境均为 `0.0.4`，migration=22，公网 live/ready 通过；内置回切未触发。
- Web 与 Nginx 随后单独切换为 `0.0.4`，容器运行、OCI label、Nginx `-t`、公网 Web 200 和 API ready 均通过；任务中心、计划管理、检查/CAPA 三个新懒加载 chunk 在容器内存在且公网可取。
- 完成前独立复验通过：Compose 配置、API/DB/Redis 健康、三个应用镜像/标签/状态、22 条 migration、4 张关键安全表、0 行存量批次、三份备份 SHA-256、5 份发布证据、10 条 Web 直达路由、4 个受保护 API 的 401、3 个新懒加载资产、公网 live/ready、系统 timers 均符合预期。
- 切换后最近 20 分钟 API/Nginx 错误标记均为 0，未残留一次性 Compose 容器；服务器侧和本机外部网络重复检查均返回 Web 200、API live/ready。
- 不能由本次自动化代替的唯一现场项是企业微信 iOS、Android、桌面三端的真实 OAuth/JS-SDK/业务主链操作；该项不得表述为已执行。
- 最终本地一致性复验确认 11 个全局版本文件全部为 `0.0.4`，前端 `apps/web/src` 中没有版本号/`SUNAN_VERSION` 展示引用；文档索引 269 份、diff 格式均通过。用户已有 4 个 `.superpowers` 删除项保持原样，未被恢复或纳入版本文件。

## 2026-07-11：M8 Wave 5 启动记录
- 用户要求实施可复用计划任务中心、统一待办、真实日历与企业微信任务消息，明确 Wave 4 主数据已经验收。
- 当前工作树干净，最新提交为 `dfd83de M8 Wave4完成`；现有根目录规划文件仍停留在 Wave 2，需要以本 Wave 的验收目标重置当前阶段，但保留历史记录。
- 按仓库规则，后续必须先阅读 M8 需求、执行计划、backlog、Wave 5 prompt、通知/企业微信/前端体验规格、Wave 2 权限规格、Wave 4 主数据规格和安全领域入口，再冻结本 Wave 规格并按 TDD 进入实现。
- Wave 5 的硬性边界已确认：任务是后续安全领域的统一执行入口；计划/任务必须有稳定幂等键、失败补偿、审计和 PostgreSQL 级唯一约束；待办、日历和计划完成率必须由同一任务真源派生；企业微信应用消息只作提醒，不作为任务状态真源。
- 既有通知规格只覆盖证书/合同到期，企业微信消息规格已明确失败对象、`42001` 刷新后重试一次、网络至多重试三次和频率限流降速；Wave 5 需要在这份真源规格中补充任务消息的去重键、深链和发送审计。
- 企业微信 H5 页面必须支持从工作台或消息直达，OAuth 恢复后保留目标任务 URL；安全领域不得新增第五个一级导航。
- Wave 2 的授权模型可直接复用到新任务：读取需通过 ABAC，动作还需通过当前责任/参与、状态、有效代理与职责隔离；前端只能使用后端返回的可用动作，且转移必须留存原责任、新责任、原因、操作人和时间。
- Wave 4 提供可授权的船舶、人员与有效任职选择器；新计划/任务不应要求输入 UUID，已停用对象不能用于新计划。
- 代码检索确认现有系统已有证书提醒的扫描、消息发送锁与 upsert 幂等实现，以及企业微信消息服务；Wave 5 应抽取通用任务消息与任务生成机制，而不是让日历或待办继续依赖提醒模块的证书专用模型。
- 路由现有懒加载与 `backTo` 安全回跳模式；Wave 5 任务详情深链可沿用相同的本地安全回跳/认证恢复模式。
- 用户已在布局对比中选择 A：任务中心以待办为主，`待办 / 我发起 / 我参与 / 已完成 / 逾期` 是统一数据范围标签，列表与日历仅为同一真实任务筛选的双视图；移动端默认列表，用户主动切换日历。
- 用户确认计划负责人可直接创建/启用，系统管理员才可跨数据范围启用或取消；Wave 5 不增加独立计划审批流。
- OAuth 前端已有 `sunan_post_auth_redirect` 的安全本地路径保存与回调消费机制，可由任务详情路由直接复用，满足消息落地页认证恢复后回到目标任务的实现基础。
- `WecomMessageService` 已封装文本卡片、`42001` 强制刷新 token、网络超时三次尝试和无效接收人结果；Wave 5 需要补上持久化出站任务消息记录、业务去重键、重试计划和对账，而不是在服务内存中判断重复。
- TypeORM 显式维护实体与 migration 注册，Wave 5 必须同步新增实体、module `forFeature` 注册、迁移类和 config imports；当前迁移序号最后为 `1710000018000`。
- 工作平台主页和 API 是独立的既有记录中心，不能作为计划任务真源；Wave 5 应建设独立 `plan-task` 领域模块，只在工作平台入口与路由层集成。证书提醒引擎的唯一键/发送锁模式可作为 generator/message 可靠性实现的参考。
- 用户已审阅并授权继续执行 Wave 5 设计。`writing-plans` 专用 skill 不在当前可用技能列表，已用本仓库已启用的 `planning-with-files-zh` 持久化计划作为等价实现计划；此替代不改变已确认的 SDD/TDD 顺序。
- W5.1 已将计划、计划项、任务、参与人、不可变动作/转移/代理、生成运行/条目和逐接收人消息投递的契约冻结为独立安全领域规格；日历明确复用 `GET /tasks` 的真实任务数据，不存在独立静态排程接口。

## W5.1 规格编辑错误

| 错误 | 尝试次数 | 根因与解决方案 |
|---|---:|---|
| `apply_patch` 上下文校验失败 | 3 | API schema 中 `TaskCountSummary` 定义位于 `Task` schema 前，第一次原子补丁假定相反顺序；后两次依赖了前序失败后并不存在的日志。三次均在写入前拒绝；已改为按稳定文件锚点逐文件更新，并以最小补丁新增 `DeliveryCountSummary`。 |

## 2026-07-11：W5 实现验证
- `task-domain.spec.ts` 覆盖月末、闰年、稳定 key、逾期精确边界和改期/取消/转移规则，红灯为模块不存在，补齐领域实现后通过。
- `plan-task.integration.spec.ts` 在 PostgreSQL testcontainers 下通过并发生成唯一性和转移后旧责任人 403；最终以 `--detectOpenHandles --runInBand` 稳定退出，未再报告句柄泄漏。
- Wave 5 最终使用 `safety_tasks.generation_key` 作为数据库并发闸门，每次 generation run 以 `(run_id,generation_key)` 记录 created/skipped；两个并发运行累计只创建 1 个任务。
- 每日 00:05（Asia/Shanghai）调度年度/月度/周期/单次生成、逾期升级和失败投递重试；同日升级使用稳定周期键去重。
- 完整 Web 测试中的 React Router future flag 与未连接 Form 告警已清零；API lint 同时收口 Wave 4 遗留的严格类型错误，并在采购 Wave 4 集成测试中隔离真实 OSS 网络请求。
- 2026-07-11 复核显示：`--detectOpenHandles --runInBand` 可稳定结束且未报告句柄；原警告没有可复现的句柄证据。
- 规格—实现差距根因是前序只建立垂直切片：缺生成运行表、转移/代理实体、参与人完成进度、DTO/idempotency、完整 ABAC、投递对账 worker、计划项 UI 和 OAuth 目标任务回归；现有 Controller 也缺 OpenAPI 中的 PATCH/GET items、run list、delivery retry 等契约覆盖。
- 当前 `PlanManagementPage` 只建计划不建计划项；`TaskDetailPage` 对所有动作使用固定原因且没有改期/转移/代理参数，不能满足验收。

## 2026-08-19：移除实际系统不存在的安全管理操作
- 用户明确确认其实际系统中不存在安全管理操作。即使仓库源码仍保留相关路由或历史实现，也不能将其写入用户操作手册。
- 本轮需整体删除安全主数据、安全计划/任务、检查模板/计划/现场检查、安全问题、CAPA，以及所有前置说明、角色职责、管理员检查、FAQ、合规条款、截图位和维护依据中的关联内容。
- 工作平台中的“安全月、安全隐患、自查、检验、海事安检、检查整改”也属于用户确认不存在的操作，应从模块总览、模板、流程和截图中删除。
- 删除旧第 9 章和以现场检查为中心的旧第 10 章后，旧第 11-16 章需改为新第 9-14 章；第 8 章图片从 8 个减为 7 个并连续重排。
- 已完成清理：Markdown 1492 行、14 章；安全相关章节、入口、角色、路由、截图位、FAQ、合规和维护依据均已移除。
- 已同步删除 `docs/README.md` 与 `docs/inventory.md` 中指向已删除安全培训/对比文档的断链，并重新生成 inventory（276 个 Markdown）。
- 图片统计为 40 张真实截图、7 个正式 4:3 占位和 1 个第 1 章示例占位，共 48 个图片引用；DOCX 生成器已改为 14 个章节页码提示。
- DOCX 生成、A4 渲染、DOCX validator、PDF/XML 禁用术语扫描、`node scripts/check-doc-index.mjs` 和 `git diff --check` 均通过；最终 Word 为 105 页，目录页码与章节实际起始页一致。

## 2026-08-19：最新版真实功能手册与截图替换
- 用户新增一批实际截图，位于 `docs/handbook/image/`；文件名按现有图号/功能命名，包含登录授权、导航、我的、办事、采购、文件上传/预览、报表审批和工作平台首页等场景。
- 本轮不能仅替换图片：用户明确指出上一版手册存在系统不存在的功能或步骤，必须重新以当前源码和规格为真源审计正文，并同步修正 Markdown 与 DOCX。
- 当前仓库和 API/Web 包版本真源均为 `0.0.7`；上一版手册仍写 `0.0.5`，本轮需同步更新为 2026-08-19 核对。
- `image/` 共 40 张真实截图：第 3 章 6 张、第 4 章 3 张、第 5 章 14 张、第 6 章 5 张、第 7 章 12 张、第 8 章 1 张；没有第 9 章安全管理截图。截图比例混合桌面横图、手机长图和超长报表图，必须保持原比例，不得拉伸或强行裁为 4:3。
- 当前手册图片位共 75 个（含第 1 章示例），本轮正式位置改为 40 个真实图片 + 34 个 4:3 占位，另保留 1 个示例占位。
- 当前代码真实存在采购附件解除接口 `DELETE /api/v1/procurement/orders/:id/attachments/:fileId`、安全计划/任务/检查/CAPA 路由，以及 `goa_training`、`goa_meeting`、`goa_year_plan`、`shipping_fuel_bunkering_approval` 等工作平台模块；不能按旧手册笼统删除整个安全或通用工作平台章节，而应修正具体按钮和字段描述。
- 真实截图的尺寸混合为桌面横图、手机长图和超长采购报表图。Markdown 中直接引用原图；DOCX 生成器对真实图按比例缩放，长图切成连续片段后分页，4:3 只用于缺失图位占位。
- 第 9 章没有提供真实截图，因此主数据、计划、任务、检查、问题和 CAPA 图位全部保留为待补 4:3 占位；第 8 章除工作平台首页外也保留待补图位。正式图位统计为 40 张真实图 + 34 张占位图。
- 源码核对未发现需整章移除的现有功能。检查模板当前只有创建草稿/查看，主数据页当前只有查询/选择/档案列表，采购审批和报表审批当前均为系统内审批，采购新建页当前没有附件控件；手册已按这些真实边界表述。
