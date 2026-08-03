---
status: audit-snapshot
owner: frontend
updated: 2026-08-04
replaces: []
replaced_by: []
---
# 前后端接口覆盖审计

## 审计基线

- 前端：`Fix-ding` 的 `apps/web/src/features/**/*Api.ts`。
- 后端：`origin/main` 的 `apps/api/src/**/*controller.ts`；当前分支 Controller 与 `origin/main` 无差异。
- 主键：HTTP 方法 + 规范化路径，动态参数统一记为 `:id`。
- 范围：浏览器业务请求；测试中的 `vi.mock` 不计入运行时接口。

## 结论

| 项目 | 数量 | 结果 |
|---|---:|---|
| 前端 API 定义 | 132 | 132 个均能匹配 `origin/main` Controller |
| 后端 Controller 路由 | 177 | 45 个没有前端 API 映射 |
| 前端孤儿接口 | 0 | 没有前端调用指向不存在的后端路由 |
| 后端缺失的现有前端请求 | 0 | 当前页面不会请求不存在的接口 |

当前优化前端已取消运行时 mock，认证、文件上传、企业微信 JS-SDK 以及各业务页面均通过真实 API 基础查询发起请求。接口失败显示错误或空态，不再用固定业务数字补位。

## 已对接矩阵

下表统计每个前端 API 文件中的方法/路径定义。各行所含端点均已与 `origin/main` Controller 逐项匹配。

| 领域 | 前端文件 | 已匹配端点数 | 后端入口 |
|---|---|---:|---|
| 认证 | `authApi.ts` | 4 | `/auth/*` |
| 证照 | `certificateApi.ts` | 8 | `/certificates*`、`/certificate-types`、`/certificate-owners` |
| 企业资料与制度 | `enterpriseApi.ts` | 14 | `/enterprise-profiles/*`、`/enterprise-policies/*` |
| 文件 | `filesApi.ts` | 4 | `/files/*` |
| 船舶监控 | `monitorApi.ts` | 5 | `/ship-monitors/*` |
| 办事 | `officeApi.ts` | 9 | `/office/*` |
| 采购 | `procurementApi.ts` | 33 | `/procurement/*` |
| 证照提醒 | `reminderApi.ts` | 5 | `/certificate-reminders/*` |
| 设置 | `settingsApi.ts` | 2 | `/settings` |
| 检查与 CAPA | `inspectionCapaApi.ts` | 19 | `/inspection-*`、`/inspections/*`、`/issues/*`、`/capas/*` |
| 安全主数据 | `masterDataApi.ts` | 4 | `/master-data/*` |
| 计划任务 | `taskApi.ts` | 11 | `/plans/*`、`/tasks/*` |
| 工作台 | `workbenchApi.ts` | 14 | `/workbench/*`、`/wecom/approval/launch` |
| **合计** |  | **132** | **全部匹配** |

首页的真实数据来源如下：

| 页面 | 当前真实接口 |
|---|---|
| 我的 | 企业资料、企业制度、证照、船舶监控、提醒看板/列表、工作台看板 |
| 办事 | 分类、入口目录、入口打开记录、治理台 |
| 采购 | 预算汇总、待审批任务、采购订单 |
| 工作台 | 工作台看板、工作台记录、考勤统计 |

## 后端缺少的产品能力

这些不是“前端请求 404”，而是现有设计需要、主分支尚未提供的业务能力。前端目前以中性空态或已有接口组合处理。

| 优先级 | 建议接口或契约 | 缺口 | 当前前端处理 |
|---|---|---|---|
| P0 | `GET /office/cases/summary` | 无法提供个人办理的待提交、审批中、已办结统计 | “我的办理”显示“暂未提供办理统计” |
| P0 | `GET /office/cases`、`GET /office/cases/:id` | 无法继续办理或查看审批进度；当前后端只有入口目录与打开审计 | 不展示虚假办理记录 |
| P1 | `GET /office/entries?sort=frequency` 或独立高频入口接口 | 无法按真实使用频次提供“高频办事” | 首页只标为“办事入口”，按后端配置顺序展示前三项并提供完整入口页 |
| P1 | 扩充 `GET /procurement/approvals/pending` DTO | 缺少 `meta.total`、金额、超预算标记和申请人展示名；数组长度不能代表完整待办总数，审批人的个人订单列表也不能可靠补齐任务信息 | 请求后端允许的 100 条上限，满页显示 `100+`；只展示接口明确返回的标题、部门和审批节点，不猜测金额、超预算状态或申请人 |
| P1 | 为考勤导出任务增加持久化 worker lease/heartbeat 与中断任务协调恢复能力 | 多实例部署中，不能仅凭 `running` 时长判断任务已中断，否则会与仍在执行的实例产生重复上传和状态覆盖 | 当前只原子领取并恢复 `queued` 任务；不自动重试无租约的 `running` 任务，异常中断任务需运维核查，待租约机制完成后才能安全自动恢复 |
| P2 | `GET /my/dashboard` 聚合接口 | 我的首页需要并发请求多个领域接口，企业微信弱网下首屏成本较高 | 继续调用现有真实领域接口；任一失败显示部分数据失败 |

其中 P0 会阻断办事模块“继续办理/查看审批进度”的完整闭环；其余缺口不阻断现有页面使用，但影响排序、信息完整度或首屏性能。

## 后端已有但前端未映射

### 适合补前端能力

| 领域 | 后端端点 | 说明 |
|---|---|---|
| 证照 | `DELETE /certificates/:id` | 后端支持删除，前端 API 尚未声明 |
| 企业资料 | `DELETE /enterprise-profiles/:id/files/:fileId` | 后端支持单附件解绑，前端只支持批量绑定 |
| 检查模板 | `GET /inspection-templates/:id/versions` | 模板版本列表未接入 |
| 检查模板 | `POST /inspection-templates/:id/versions` | 新建模板版本未接入 |
| 检查模板 | `POST /inspection-template-versions/:id/publish` | 发布模板版本未接入 |
| 检查计划 | `POST /inspection-plans/:id/generation-runs` | 检查实例生成未接入 |
| 问题闭环 | `GET /issues/statistics` | 问题统计看板未接入 |
| 问题闭环 | `POST /issues` | 独立创建问题未接入 |
| 主数据 | `POST /master-data/vessels` | 船舶主数据新增未接入 |
| 主数据 | `GET /master-data/vessels/:id` | 船舶主数据详情未接入 |
| 主数据 | `PATCH /master-data/vessels/:id` | 船舶主数据编辑未接入 |
| 主数据 | `POST /master-data/personnel` | 人员主数据新增未接入 |
| 主数据 | `GET /master-data/personnel/:id` | 人员主数据详情未接入 |
| 主数据 | `PATCH /master-data/personnel/:id` | 人员主数据编辑未接入 |
| 主数据 | `POST /master-data/assignments` | 人员任职/分配未接入 |
| 主数据 | `POST /master-data/equipment` | 设备主数据新增未接入 |
| 主数据 | `GET /master-data/equipment/:id` | 设备主数据详情未接入 |
| 主数据 | `PATCH /master-data/equipment/:id` | 设备主数据编辑未接入 |
| 主数据 | `POST /master-data/imports` | 主数据导入未接入 |
| 主数据 | `GET /master-data/imports/:id` | 导入结果未接入 |
| 主数据 | `POST /master-data/references/normalize` | 引用归一化未接入 |
| 办事 | `GET /office/entries/:id` | 入口详情未单独使用；首页直接从列表打开 |
| 计划任务 | `PATCH /plans/:id` | 计划编辑未接入 |
| 计划任务 | `GET /plans/:id/items` | 计划项列表未接入 |
| 计划任务 | `PATCH /plans/:id/items/:itemId` | 计划项编辑未接入 |
| 任务通知 | `GET /tasks/:id/notification-deliveries` | 通知投递记录未接入 |
| 船舶监控 | `GET /ship-monitors/:id` | 单条监控详情未单独使用 |
| 企业微信审批 | `GET /wecom/approval/instances` | 审批实例列表未接入 |
| 企业微信审批 | `GET /wecom/approval/instances/:id` | 审批实例详情未接入 |
| 工作台导出 | `GET /workbench/statistics/attendance/export` | 考勤异步导出未接入 |
| 工作台导出 | `GET /workbench/export-jobs/:id` | 导出任务状态未接入 |
| 工作台导出 | `POST /workbench/export-jobs/:id/retry` | 导出重试未接入 |
| 工作台导出 | `GET /workbench/export-jobs/:id/download-url` | 导出下载未接入 |
| 工作台记录 | `POST /workbench/records/:id/participants` | 参与人维护未接入 |

### 不应由 H5 主动调用

| 类型 | 后端端点 | 原因 |
|---|---|---|
| 健康检查 | `GET /api/health`、`GET /api/health/ready` | 负载均衡与运维探针 |
| 企业微信回调 | `GET /wecom/callback` | 企业微信服务器验证回调 |
| 企业微信审批回调 | `GET /wecom/approval/callback`、`POST /wecom/approval/callback` | 企业微信服务器调用 |
| 后台对账 | `POST /issue-transfer-jobs/actions/reconcile` | 运维/后台任务 |
| 后台投递 | `POST /task-notification-deliveries/actions/process` | 后台任务 |
| 后台生成 | `POST /plan-task-jobs/actions/run` | 后台任务 |
| 审批运维 | `POST /wecom/approval/reconcile`、`POST /wecom/approval/retry` | 对账与失败重试 |
| 考勤运维 | `POST /workbench/statistics/attendance/reconcile` | 对账操作 |

以上两组共 45 个后端无前端映射端点：34 个可按产品优先级补 UI，11 个属于探针、回调或后台运维，不应为了“覆盖率”创建 H5 页面。

## 已声明但页面未使用

以下端点已经在前端 API 层映射，但当前没有生产页面调用：

| 前端 Hook | 后端端点 | 建议 |
|---|---|---|
| `useDeleteEnterprisePolicyMutation` | `DELETE /enterprise-policies/:id` | 制度治理页补删除操作或删除无用映射 |
| `useUpdateShipMonitorMutation` | `PATCH /ship-monitors/:id` | 监控管理页需要编辑能力时启用 |
| `useDeleteShipMonitorMutation` | `DELETE /ship-monitors/:id` | 监控管理页需要删除能力时启用 |
| `useGetWorkbenchModulesQuery` | `GET /workbench/modules` | 当前首页从 `/workbench/dashboard` 获取模块，独立模块查询暂不需要 |

`GET /workbench/records/:id/print` 同时导出了普通与 lazy 查询 Hook；生产页面使用 lazy Hook，因此不属于未使用接口。

## 联调门槛

真实企业微信联调需要有效的 `VITE_API_BASE_URL`、`VITE_WECOM_CORP_ID`、`VITE_WECOM_AGENT_ID`，后端还需配置数据库、JWT、企业微信密钥、回调域名和文件存储。缺少这些外部凭据时，可以完成编译、契约和后端自动化测试，但不能把浏览器 OAuth 跳转成功当作已验证。

## 2026-08-04 验证记录

本次验证使用本地 PostgreSQL、Redis 和真实 NestJS API，浏览器只在 `localStorage` 写入由本地开发 JWT 密钥签发的短期令牌，用于绕过尚未配置凭据的企业微信 OAuth 外部跳转。仓库代码中没有保留认证旁路。

| 验证项 | 结果 |
|---|---|
| 前端测试 | 53 个测试文件、205 项测试通过 |
| 前端生产构建 | `pnpm --filter web build` 通过 |
| 后端构建与 lint | `pnpm --filter api build`、`pnpm --filter api lint` 通过 |
| 后端单元测试 | 16 个测试套件、79 项测试通过 |
| 后端集成测试 | 18 个测试套件、79 项测试通过；使用 PostgreSQL Testcontainers |
| 真实 API 冒烟 | 认证、企业资料/制度、证照、监控、提醒、办事、采购、工作台共 15 个业务请求返回 200 |
| 浏览器联调 | `/my`、`/office`、`/procurement`、`/workbench` 和 `/workbench/modules/shipping_chart_update` 均从真实 API 加载 |

本地 `GET /api/health/ready` 仍返回 503。数据库和 Redis 已通过迁移、种子及业务请求验证，未就绪项是未配置真实对象存储凭据；这不应在生产部署时忽略。企业微信 OAuth、JS-SDK 签名和文件直传同样需要部署方提供真实企业微信及对象存储配置后再完成上线验收。

本地使用 Colima 运行 Testcontainers 时需要显式设置 `DOCKER_HOST=unix://$HOME/.colima/default/docker.sock` 和 `TESTCONTAINERS_DOCKER_SOCKET_OVERRIDE=/var/run/docker.sock`。若本机的 `5432`、`6379` 已被占用，应为项目 PostgreSQL、Redis 分配独立端口，并确保迁移、种子和 API 进程加载同一份环境变量。
