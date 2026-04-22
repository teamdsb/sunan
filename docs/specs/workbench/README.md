# 工作平台模块规格

## 模块定位

“工作平台”负责承载总经办、财务部、业务部、船务部、后勤部及工作组全量业务。M4 完成了模块矩阵和模板分类，M5 完成了运行时正式化、审批桥与上线强化，M6 的目标是把工作平台升级为：

- 独立模块页面，而不再主要依赖 `/workbench` 单页通用壳层。
- 统一运行时、统一权限、统一审批桥继续保留。
- 新增管理员运维台、导出任务、对账任务和诊断事件能力。
- `财务板块` 与 `海图更新` 从遗留边界进入独立 SDD。

## M6 设计原则

### 1. 统一 bounded context 不拆散

- M6 不把工作平台重构成几十个独立后端模块。
- 继续复用统一的 `records / actions / attachments / print / approval` 运行时模型。

### 2. 页面独立化

- 冻结模块级独立路由。
- `GET /workbench/modules/:moduleCode/schema` 只承担页面元数据与共享字段定义。
- 页面层通过专属列表、专属详情、专属打印模板承接高保真业务。

### 3. 审批单真源不变

- 审批类模块继续以企业微信审批实例为真源。
- 系统内只保留业务镜像、上下文、归档、异常诊断与补偿能力。

### 4. 遗留模块显式分层

- `财务板块` 使用 provisional SDD，未被样表支持的字段显式标记。
- `海图更新` 使用正式 SDD，并与 `chart_update` 提醒能力衔接。

## 规格文档清单

| 层次 | 文件 | 状态 |
|---|---|---|
| API | `api/workbench-platform-api.yaml` | M5 已有，M6 继续复用 |
| API | `api/workbench-approval-api.yaml` | M6 更新查询维度 |
| API | `api/workbench-admin-api.yaml` | M6 新增 |
| API | `api/workbench-statistics-api.yaml` | M4 历史补充 |
| DB | `db/workbench-domain-model.md` | M4 归档 |
| DB | `db/workbench-runtime-schema.md` | M5 已新增 |
| DB | `db/workbench-module-matrix.md` | M6 重写 |
| DB | `db/workbench-permission-matrix.md` | M4 归档 |
| DB | `db/finance-module-provisional.md` | M6 新增 |
| DB | `db/chart-update-module.md` | M6 新增 |
| State | `state/workbench-shell.md` | M4 归档 |
| State | `state/workbench-records.md` | M5 已更新 |
| State | `state/workbench-approval-sync.md` | M5 已更新 |
| State | `state/workbench-admin-console.md` | M6 新增 |
| UI | `ui/workbench-information-architecture.md` | M4 归档 |
| UI | `ui/workbench-template-pages.md` | M4 归档 |
| UI | `ui/workbench-department-modules.md` | M6 重写 |
| UI | `ui/workbench-module-route-map.md` | M6 新增 |
| UI | `ui/workbench-admin-console.md` | M6 新增 |
| UI | `ui/finance-module-provisional.md` | M6 新增 |
| UI | `ui/chart-update-module.md` | M6 新增 |
| Planning | `m5-optimization-backlog.md` | M5 历史输入 |
| Acceptance | `acceptance-m6-wave1.md` | M6 Wave 1 已归档 |
| Acceptance | `acceptance-m6-wave2.md` | M6 Wave 2 已归档 |
| Acceptance | `acceptance-m5-wave1.md` ~ `acceptance-m5-wave4.md` | M5 历史归档 |
| Acceptance | `acceptance-wave1.md` ~ `acceptance-wave8.md` | M4 历史归档 |

## 模块范围概览

### 总经办

- 培训管理
- 会议管理
- 安全月活动
- 安全隐患排查管理
- 年度工作计划

### 财务部

- 统计中心
- 财务板块

### 业务部

- 作业人员签到台
- 接收工作组操作流程
- 围油栏
- 签船记录表
- 船舶动态记录表
- 船舶垃圾
- 船舶污油水
- 生活污水接收记录

### 船务部

- 船员培训学时统计
- 船舶自查排查
- 船员考勤
- 船舶设施设备保养
- 船舶检验
- 船舶演练系统
- 密闭空间系统
- 值守记录系统
- 岸基叫应
- 海图更新
- 船员会议记录
- 污油水接收作业
- 海事安检系统
- 案例警示学习
- 航次计划审批
- 燃油加注

### 后勤部

- 仓库
- 办公室
- 食堂
- 宿舍
- 车辆维修保养

### 工作组

- 中船工作组五步作业闭环
- 平陆运河工作组五步作业闭环

## M6 推荐阅读顺序

1. `docs/requirements/M6-全量兑现与完美上线.md`
2. `db/workbench-module-matrix.md`
3. `ui/workbench-module-route-map.md`
4. `ui/workbench-department-modules.md`
5. `ui/workbench-admin-console.md`
6. `state/workbench-admin-console.md`
7. `api/workbench-approval-api.yaml`
8. `api/workbench-admin-api.yaml`
9. `db/finance-module-provisional.md`
10. `db/chart-update-module.md`
11. `docs/specs/wecom/jssdk-spec.md`
12. `docs/specs/wecom/workbench-go-live-checklist.md`

## 状态说明

| 状态 | 含义 |
|---|---|
| `已实现` | 已有独立页面、字段、流程和测试，可直接交付 |
| `已有底座` | 已有 moduleCode、schema、持久化 API 和统一壳层能力，但仍缺模块级独立页面 |
| `M6 待高保真` | 已进入 M6 正式范围，需要冻结字段组、页面组、动作、打印和验收点 |
| `M6 遗留` | 在 M5 仅冻结边界，需在 M6 新建或升级为独立 SDD |

## 与其他文档关系

- 权限基础：`docs/specs/common/auth-spec.md`
- 文件上传基础：`docs/specs/common/file-upload-spec.md`
- 消息推送基础：`docs/specs/common/notification-spec.md`
- 企业微信 OAuth2 / JS-SDK / token 缓存：`docs/specs/wecom/*`
- M6 执行计划：`docs/execplans.md`
