# 工作平台模块规格（M4）

## 文档定位

本目录承载里程碑 4 “工作平台”全量业务实现的规格文档。

工作平台采用统一平台底座 + 模板化业务能力设计，后续开发应优先复用模板和公共接口，而不是为单个模块新增独立架构。

## 规格目录

- `api/workbench-platform-api.yaml`
  - 工作平台首页、模块入口、记录列表/详情/动作、附件、打印接口。
- `api/workbench-statistics-api.yaml`
  - 考勤、作业时长、油耗与汇总类统计接口。
- `api/workbench-approval-api.yaml`
  - 企业微信审批发起、回调、状态查询与对账接口。
- `db/workbench-domain-model.md`
  - 核心实体、关系、状态机和存储建议。
- `db/workbench-module-matrix.md`
  - 全量模块矩阵、模板分类、打印/统计/审批属性。
- `state/workbench-shell.md`
  - 工作平台前端壳层、入口权限、待办、过滤与路由态。
- `state/workbench-records.md`
  - 列表、详情、动作、附件、打印前端状态规格。
- `state/workbench-approval-sync.md`
  - 审批类模块的回调同步、镜像状态与异常处理。
- `ui/workbench-information-architecture.md`
  - 页面信息架构与统一导航骨架。
- `ui/workbench-template-pages.md`
  - 六类业务模板的页面组合与交互约束。
- `ui/workbench-department-modules.md`
  - 各部门模块对模板的映射、字段高保真要求与实现边界。

## 核心设计原则

### 1. 模板优先

所有工作平台模块必须先归类到以下模板之一：

- `ledger_form`
- `operation_flow`
- `inspection_rectification`
- `attendance_statistics`
- `service_asset`
- `wecom_approval`

### 2. 平台统一能力

工作平台统一提供：

- 模块注册与入口可见性
- 工作台首页与待办聚合
- 通用列表/详情/动作
- 附件上传与打印快照
- 操作日志与审计
- 企业微信消息与审批桥
- 统计汇总与导出

### 3. 审批真源规则

- 有审批语义的模块，以企业微信审批实例状态为真源。
- 非审批类模块仍使用系统内部状态机。
- 系统内部对审批类模块只保留镜像状态与业务上下文，不做双真源。

## 模块范围概览

### 总经办
- 培训管理
- 会议管理
- 安全月活动
- 安全隐患排查管理
- 年度工作计划

### 财务部
- 统计中心

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

## 推荐阅读顺序

1. `db/workbench-module-matrix.md`
2. `db/workbench-domain-model.md`
3. `api/workbench-platform-api.yaml`
4. `api/workbench-approval-api.yaml`
5. `state/*.md`
6. `ui/*.md`

## 与其他文档的关系

- 权限基础：`docs/specs/common/auth-spec.md`
- 文件上传基础：`docs/specs/common/file-upload-spec.md`
- 消息推送基础：`docs/specs/common/notification-spec.md`
- 企业微信 OAuth2 / JS-SDK / token 缓存：`docs/specs/wecom/*`
- 工作平台企业微信专项：`docs/specs/wecom/workbench-go-live-checklist.md`
